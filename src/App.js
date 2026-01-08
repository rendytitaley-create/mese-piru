import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query } from 'firebase/firestore';
import { ShieldCheck, Loader2 } from 'lucide-react';

// GANTI BAGIAN INI DENGAN DATA FIREBASE ANDA (PASTIKAN TELITI)
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
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // 1. Masuk secara anonim ke Firebase
    signInAnonymously(auth).catch(e => console.error("Kunci API salah:", e));

    // 2. Cek apakah sudah pernah login sebelumnya
    const unsubscribe = onAuthStateChanged(auth, (fUser) => {
      const saved = localStorage.getItem('piru_session');
      if (saved) { setUser(JSON.parse(saved)); }
      setLoading(false);
    });

    // 3. Ambil data user dari koleksi 'users'
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubscribe(); unsubUsers(); };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    // Cari user di database yang username dan passwordnya cocok
    const found = users.find(u => u.username === authForm.username && u.password === authForm.password);
    
    if (found) {
      setUser(found);
      localStorage.setItem('piru_session', JSON.stringify(found));
      setAuthError('');
    } else {
      setAuthError('Username/Password salah atau Database belum terhubung');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (!user) return (
    <div className="h-screen bg-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
        <ShieldCheck size={48} className="mx-auto text-indigo-600 mb-4" />
        <h1 className="text-2xl font-bold text-center mb-6">LOGIN PIRU</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          {authError && <div className="p-3 bg-red-100 text-red-600 rounded-lg text-xs text-center">{authError}</div>}
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
    <div className="p-10 text-center">
      <h1 className="text-3xl font-bold text-green-600">BERHASIL LOGIN!</h1>
      <p className="mt-4 text-slate-600 uppercase font-bold">Halo, {user.name}</p>
      <p className="mt-2">Sekarang aplikasi Anda sudah terhubung ke Firebase.</p>
      <button onClick={() => {localStorage.clear(); window.location.reload();}} className="mt-10 px-6 py-2 bg-red-500 text-white rounded-lg">Keluar / Log Out</button>
    </div>
  );
};

export default PIRUApp;
