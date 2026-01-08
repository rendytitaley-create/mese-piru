import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  getDocs,
  query,
  where,
  setDoc,
  enableIndexedDbPersistence 
} from 'firebase/firestore';
import { 
  User, Users, CheckCircle, FileText, LogOut, Award, ChevronRight, 
  ClipboardList, ShieldCheck, Loader2, Send, Search, Filter, Trash2, 
  Calendar, BarChart3, Clock, CheckCircle2, AlertCircle, Plus, X, 
  Calculator, Download, FileSpreadsheet, Percent, Lock, UserPlus, 
  Settings, Building2, WifiOff, Wifi, Save, ChevronLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';

// === GANTI BAGIAN DI BAWAH INI DENGAN DATA DARI FIREBASE CONSOLE ANDA ===
const firebaseConfig = {
  apiKey: "AIzaSyDVRt3zgojeVh8ek61yXFQ9r9ihpOt7BqQ",
  authDomain: "piru8106-b4f0a.firebaseapp.com",
  projectId: "piru8106-b4f0a",
  storageBucket: "piru8106-b4f0a.firebasestorage.app",
  messagingSenderId: "948735762696",
  appId: "1:948735762696:web:43674d0341fc8b05e14cbd"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.appId;

// Fitur Offline
enableIndexedDbPersistence(db).catch((err) => {
    console.error("Persistence error:", err.code);
});

const PIRUApp = () => {
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

  // Menangani status online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Login Anonim & Auth State
  useEffect(() => {
    const login = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    login();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const savedUser = localStorage.getItem(`piru_user_${appId}`);
        if (savedUser) {
          setUser(JSON.parse(savedUser));
          setIsAuthModalOpen(false);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load Data dari Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `reports_${appId}`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(reportData);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users_${appId}`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userData);
    });
    return () => unsubscribe();
  }, [user]);

  // Fungsi utilitas & Handlers
  const notify = (message, type = 'success') => {
    setShowNotification({ message, type });
    setTimeout(() => setShowNotification(null), 3000);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const foundUser = users.find(u => u.username === authForm.username && u.password === authForm.password);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem(`piru_user_${appId}`, JSON.stringify(foundUser));
      setIsAuthModalOpen(false);
      setAuthError('');
      notify(`Selamat datang, ${foundUser.name}!`);
    } else {
      setAuthError('Username atau password salah');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(`piru_user_${appId}`);
    setIsAuthModalOpen(true);
    setAuthForm({ username: '', password: '' });
  };

  // Logika Filter Data
  const filteredReports = useMemo(() => {
    let result = reports;
    if (user?.role === 'pegawai') {
      result = result.filter(r => r.userId === user.id);
    }
    return result.filter(r => r.month === selectedMonth && r.year === selectedYear);
  }, [reports, user, selectedMonth, selectedYear]);

  // Tampilan Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium animate-pulse">Memuat PIRU...</p>
        </div>
      </div>
    );
  }

  // Tampilan Form Login
  if (isAuthModalOpen) {
    return (
      <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8 text-center bg-gradient-to-br from-indigo-600 to-blue-700 text-white">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <ShieldCheck size={40} />
            </div>
            <h1 className="text-3xl font-black tracking-tighter">PIRU</h1>
            <p className="text-indigo-100 text-sm font-medium opacity-80">BPS Kabupaten Seram Bagian Barat</p>
          </div>
          <form onSubmit={handleLogin} className="p-8 space-y-5">
            {authError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium flex items-center gap-3">
                <AlertCircle size={18} /> {authError}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Username</label>
              <input 
                type="text" required
                className="w-full bg-slate-100 border-none rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                value={authForm.username}
                onChange={(e) => setAuthForm({...authForm, username: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
              <input 
                type="password" required
                className="w-full bg-slate-100 border-none rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                value={authForm.password}
                onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95">
              Masuk ke Aplikasi
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Tampilan Dashboard Utama (Hanya ringkasan saja untuk demo)
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Simpel */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r transition-all duration-300 flex flex-col`}>
        <div className="p-6 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white"><ShieldCheck size={24}/></div>
          {isSidebarOpen && <span className="font-black text-xl tracking-tighter text-slate-800">PIRU</span>}
        </div>
        <nav className="flex-1 p-4 space-y-2">
           <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-indigo-50 text-indigo-600 font-bold">
              <BarChart3 size={20}/> {isSidebarOpen && 'Dashboard'}
           </button>
           <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all">
              <LogOut size={20}/> {isSidebarOpen && 'Keluar'}
           </button>
        </nav>
      </div>

      {/* Konten Utama */}
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
           <div>
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Selamat Datang, {user?.name}</h1>
              <p className="text-slate-500 font-medium">Aplikasi Penilaian Kinerja Bulanan BPS SBB</p>
           </div>
           <div className={`px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isOnline ? <Wifi size={14}/> : <WifiOff size={14}/>}
              {isOnline ? 'ONLINE' : 'OFFLINE MODE'}
           </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                 <div className="bg-blue-100 p-3 rounded-2xl text-blue-600"><FileText/></div>
                 <div>
                    <p className="text-sm font-bold text-slate-400 uppercase">Total Laporan</p>
                    <p className="text-2xl font-black text-slate-800">{filteredReports.length}</p>
                 </div>
              </div>
           </div>
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                 <div className="bg-amber-100 p-3 rounded-2xl text-amber-600"><Clock/></div>
                 <div>
                    <p className="text-sm font-bold text-slate-400 uppercase">Menunggu Validasi</p>
                    <p className="text-2xl font-black text-slate-800">{filteredReports.filter(r => r.status === 'pending').length}</p>
                 </div>
              </div>
           </div>
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                 <div className="bg-green-100 p-3 rounded-2xl text-green-600"><CheckCircle2/></div>
                 <div>
                    <p className="text-sm font-bold text-slate-400 uppercase">Selesai Dinilai</p>
                    <p className="text-2xl font-black text-slate-800">{filteredReports.filter(r => r.status === 'selesai').length}</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-12 text-center p-12 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
           <p className="text-slate-400 font-medium italic">Silakan lanjutkan pengelolaan data laporan melalui menu sidebar.</p>
           <p className="text-xs text-slate-300 mt-2">Versi Aplikasi 1.0.0-Stable</p>
        </div>
      </main>

      {/* Notifikasi Floating */}
      {showNotification && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold animate-in slide-in-from-bottom-5 transition-all ${showNotification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {showNotification.message}
        </div>
      )}
    </div>
  );
};

export default PIRUApp;