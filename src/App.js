import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  serverTimestamp, deleteDoc, getDocs, query, where, setDoc, 
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

// ==========================================================
// 1. PENTING: GANTI DATA DI BAWAH INI DENGAN DATA FIREBASE ANDA
// ==========================================================
const firebaseConfig = {
  apiKey: "ISI_API_KEY_ANDA",
  authDomain: "PROYEK-ANDA.firebaseapp.com",
  projectId: "PROYEK-ANDA",
  storageBucket: "PROYEK-ANDA.appspot.com",
  messagingSenderId: "NOMOR_SENDER",
  appId: "ID_APLIKASI_ANDA"
};

// Inisialisasi Firebase (Memperbaiki error 'db' is not defined)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  // Status Online/Offline
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

  // Login Anonim ke Firebase agar bisa akses Firestore
  useEffect(() => {
    signInAnonymously(auth).catch((err) => console.error("Firebase Auth Error:", err));
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const savedUser = localStorage.getItem('piru_user_session');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
          setIsAuthModalOpen(false);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Ambil Data dari Firestore (Koleksi sederhana: 'users' dan 'reports')
  useEffect(() => {
    if (!user) return;
    
    const unsubReports = onSnapshot(collection(db, "reports"), (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubReports();
      unsubUsers();
    };
  }, [user]);

  const notify = (message, type = 'success') => {
    setShowNotification({ message, type });
    setTimeout(() => setShowNotification(null), 3000);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const foundUser = users.find(u => u.username === authForm.username && u.password === authForm.password);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('piru_user_session', JSON.stringify(foundUser));
      setIsAuthModalOpen(false);
      notify(`Selamat datang, ${foundUser.name}`);
    } else {
      setAuthError('Username atau password salah!');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('piru_user_session');
    setIsAuthModalOpen(true);
  };

  const filteredReports = useMemo(() => {
    let res = reports;
    if (user?.role === 'pegawai') res = res.filter(r => r.userId === user.id);
    return res.filter(r => r.month === selectedMonth && r.year === selectedYear);
  }, [reports, user, selectedMonth, selectedYear]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
    </div>
  );

  if (isAuthModalOpen) return (
    <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8 text-center bg-indigo-600 text-white">
          <ShieldCheck size={48} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold">PIRU BPS</h1>
          <p className="opacity-80">Kabupaten Seram Bagian Barat</p>
        </div>
        <form onSubmit={handleLogin} className="p-8 space-y-4">
          {authError && <div className="p-3 bg-red-100 text-red-600 rounded-lg text-sm">{authError}</div>}
          <input 
            type="text" placeholder="Username" className="w-full p-4 bg-slate-100 rounded-xl outline-none"
            value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})}
          />
          <input 
            type="password" placeholder="Password" className="w-full p-4 bg-slate-100 rounded-xl outline-none"
            value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})}
          />
          <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">MASUK</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r transition-all duration-300`}>
        <div className="p-6 font-bold text-xl text-indigo-600 flex items-center gap-2">
          <ShieldCheck /> {isSidebarOpen && "PIRU"}
        </div>
        <nav className="p-4 space-y-2">
          <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-indigo-50 text-indigo-600 font-bold">
            <BarChart3 size={20}/> {isSidebarOpen && "Dashboard"}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600">
            <LogOut size={20}/> {isSidebarOpen && "Keluar"}
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Halo, {user?.name}</h2>
          <div className={`px-4 py-2 rounded-full text-xs font-bold ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isOnline ? "ONLINE" : "OFFLINE"}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-slate-400 text-sm font-bold uppercase">Total Laporan</p>
            <p className="text-3xl font-black">{filteredReports.length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-slate-400 text-sm font-bold uppercase">Menunggu</p>
            <p className="text-3xl font-black">{filteredReports.filter(r => r.status === 'pending').length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-slate-400 text-sm font-bold uppercase">Selesai</p>
            <p className="text-3xl font-black">{filteredReports.filter(r => r.status === 'selesai').length}</p>
          </div>
        </div>

        <div className="mt-10 p-20 border-2 border-dashed border-slate-200 rounded-[3rem] text-center text-slate-400">
          Selamat! Aplikasi sudah terhubung ke database. <br/>
          Gunakan Sidebar untuk mengelola laporan dan penilaian.
        </div>
      </main>

      {showNotification && (
        <div className="fixed bottom-10 right-10 bg-green-600 text-white p-4 rounded-2xl shadow-xl animate-bounce">
          {showNotification.message}
        </div>
      )}
    </div>
  );
};

export default PIRUApp;
