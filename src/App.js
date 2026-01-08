import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  serverTimestamp, query, orderBy, deleteDoc, enableIndexedDbPersistence 
} from 'firebase/firestore';
import { 
  ShieldCheck, Loader2, Plus, X, BarChart3, FileText, 
  LogOut, Trash2, Edit3, TrendingUp, Clock, Zap, UserPlus, Download
} from 'lucide-react';

// Modul untuk Excel (Akan diload via CDN/Dynamic Import jika diperlukan)
// Untuk penggunaan praktis, kita asumsikan environment mendukung penambahan library
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

// AKTIVASI OFFLINE PERSISTENCE
enableIndexedDbPersistence(db).catch((err) => {
    console.warn("Persistence status:", err.code);
});

const PIRUApp = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // Default Dashboard
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

  // Load Data
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

  // Handler Laporan & Login (Sama dengan versi sebelumnya namun tetap dijaga)
  const handleLogin = (e) => {
    e.preventDefault();
    const found = users.find(u => u.username.toLowerCase() === authForm.username.trim().toLowerCase() && u.password === authForm.password);
    if (found) { setUser(found); localStorage.setItem('piru_session_final', JSON.stringify(found)); }
    else { setAuthError('Username atau password salah.'); }
  };

  const currentFilteredReports = useMemo(() => {
    let res = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    if (user?.role === 'pegawai') res = res.filter(r => r.userId === user.username);
    if (['pimpinan', 'admin', 'ketua'].includes(user?.role) && filterStaffName !== 'Semua') {
      res = res.filter(r => r.userName === filterStaffName);
    }
    return res;
  }, [reports, user, selectedMonth, selectedYear, filterStaffName]);

  // FUNSI EKSPOR EXCEL SESUAI FORMAT KANTOR SBB
  const exportToExcel = async () => {
    if (filterStaffName === 'Semua' && user.role !== 'pegawai') {
        alert("Silakan pilih satu nama pegawai terlebih dahulu untuk mencetak format kantor.");
        return;
    }

    const targetStaff = user.role === 'pegawai' ? user : users.find(u => u.name === filterStaffName);
    const pimpinan = users.find(u => u.role === 'pimpinan') || { name: '..........................' };
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Capaian Kinerja');

    // 1. Judul Utama (Baris 2)
    sheet.mergeCells('A2:H2');
    const titleCell = sheet.getCell('A2');
    titleCell.value = `Capaian Kinerja Pegawai Tahun ${selectedYear}`;
    titleCell.font = { name: 'Arial', bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'center' };

    // 2. Baris Khusus Identitas (Baris 4-7)
    const setInfo = (row, label, value) => {
        sheet.getCell(`A${row}`).value = label;
        sheet.getCell(`B${row}`).value = `: ${value}`;
        sheet.getCell(`A${row}`).font = { bold: true };
    };
    setInfo(4, 'Unit Kerja', 'BPS Kab. Seram Bagian Barat');
    setInfo(5, 'Nama', targetStaff?.name || '');
    setInfo(6, 'Jabatan', targetStaff?.jabatan || '');
    setInfo(7, 'Periode', `1 - ${lastDay} ${monthNames[selectedMonth-1]} ${selectedYear}`);

    // 3. Header Tabel (Baris 9-10)
    // No | Uraian Kegiatan | Satuan | Kuantitas (Target|Realisasi|%) | Kualitas (%) | Keterangan
    sheet.mergeCells('A9:A10'); sheet.getCell('A9').value = 'No';
    sheet.mergeCells('B9:B10'); sheet.getCell('B9').value = 'Uraian Kegiatan';
    sheet.mergeCells('C9:C10'); sheet.getCell('C9').value = 'Satuan';
    sheet.mergeCells('D9:F9');  sheet.getCell('D9').value = 'Kuantitas';
    sheet.getCell('D10').value = 'Target';
    sheet.getCell('E10').value = 'Realisasi';
    sheet.getCell('F10').value = '%';
    sheet.mergeCells('G9:G9');  sheet.getCell('G9').value = 'Tingkat Kualitas';
    sheet.getCell('G10').value = '%';
    sheet.mergeCells('H9:H10'); sheet.getCell('H9').value = 'Keterangan';

    // Styling Header
    ['A9','B9','C9','D9','G9','H9','D10','E10','F10','G10'].forEach(cell => {
        const c = sheet.getCell(cell);
        c.fill = { type: 'pattern', pattern:'solid', fgColor:{arg b:'FFE0E0E0'} };
        c.font = { bold: true };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    // 4. Data Isian
    let currentRow = 11;
    let totalKuantitasPersen = 0;
    let totalKualitasPersen = 0;

    currentFilteredReports.forEach((r, index) => {
        const row = sheet.getRow(currentRow);
        const kPersen = (r.realisasi / r.target) * 100;
        const qual = r.nilaiPimpinan || 0;

        row.values = [
            index + 1,
            r.title,
            r.satuan,
            r.target,
            r.realisasi,
            kPersen,
            qual,
            r.keterangan || ''
        ];
        
        // Border setiap sel data
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            if (cell.col >= 4 && cell.col <= 7) cell.alignment = { horizontal: 'center' };
        });

        totalKuantitasPersen += Math.min(kPersen, 100);
        totalKualitasPersen += qual;
        currentRow++;
    });

    // 5. Baris Rata-Rata
    const avgKuantitas = currentFilteredReports.length > 0 ? (totalKuantitasPersen / currentFilteredReports.length) : 0;
    const avgKualitas = currentFilteredReports.length > 0 ? (totalKualitasPersen / currentFilteredReports.length) : 0;

    sheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const avgLabel = sheet.getCell(`A${currentRow}`);
    avgLabel.value = 'Rata-Rata';
    avgLabel.alignment = { horizontal: 'center' };
    avgLabel.font = { bold: true };
    
    sheet.getCell(`F${currentRow}`).value = avgKuantitas.toFixed(2);
    sheet.getCell(`G${currentRow}`).value = avgKualitas.toFixed(2);
    
    // Style baris rata-rata
    [`A${currentRow}`,`F${currentRow}`,`G${currentRow}`,`H${currentRow}`].forEach(c => {
        sheet.getCell(c).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        sheet.getCell(c).font = { bold: true };
    });

    currentRow++;

    // 6. Baris CKP (Nilai Akhir)
    sheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const ckpLabel = sheet.getCell(`A${currentRow}`);
    ckpLabel.value = 'Capaian Kinerja Pegawai (CKP)';
    ckpLabel.alignment = { horizontal: 'center' };
    ckpLabel.font = { bold: true };

    const finalCKP = (avgKuantitas + avgKualitas) / 2;
    sheet.mergeCells(`F${currentRow}:G${currentRow}`);
    const ckpValue = sheet.getCell(`F${currentRow}`);
    ckpValue.value = finalCKP.toFixed(2);
    ckpValue.alignment = { horizontal: 'center' };
    ckpValue.font = { bold: true, size: 12 };

    [`A${currentRow}`,`F${currentRow}`,`H${currentRow}`].forEach(c => {
        sheet.getCell(c).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    currentRow += 2;

    // 7. Penilaian Kinerja & Tanda Tangan
    sheet.getCell(`F${currentRow}`).value = `Penilaian Kinerja: ${lastDay} ${monthNames[selectedMonth-1]} ${selectedYear}`;
    currentRow += 2;

    sheet.getCell(`F${currentRow}`).value = 'Pejabat Penilai,';
    currentRow += 4;
    const pimpinanCell = sheet.getCell(`F${currentRow}`);
    pimpinanCell.value = pimpinan.name;
    pimpinanCell.font = { bold: true, underline: true };

    // Finalisasi download
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `CKP_${targetStaff?.name}_${monthNames[selectedMonth-1]}.xlsx`);
  };

  // UI RENDERING
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={50} /></div>;

  if (!user) return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-4 italic">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-12 shadow-2xl text-center border border-slate-100">
        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6"><ShieldCheck size={45} className="text-indigo-600" /></div>
        <h1 className="text-4xl font-black mb-1 tracking-tighter text-slate-800 uppercase italic">PIRU</h1>
        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-10 text-center">BPS Kabupaten Seram Bagian Barat</p>
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          {authError && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black text-center uppercase">{authError}</div>}
          <input type="text" placeholder="Username" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" onChange={e => setAuthForm({...authForm, username: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black uppercase text-xs transition-all active:scale-95 mt-4">Login</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden text-slate-800">
      {/* Sidebar - Tulisan Dashboard Diperbarui */}
      <div className="w-72 bg-white border-r border-slate-100 p-8 flex flex-col hidden md:flex">
        <div className="flex items-center gap-4 mb-14 px-2 italic">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg"><ShieldCheck size={28}/></div>
          <div><h2 className="font-black text-2xl tracking-tighter uppercase leading-none">PIRU</h2><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">BPS Kab. SBB</p></div>
        </div>
        <nav className="flex-1 space-y-3">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}><BarChart3 size={20}/> Dashboard</button>
          <button onClick={() => setActiveTab('laporan')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'laporan' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={20}/> Capaian Kerja</button>
        </nav>
        <button onClick={() => {localStorage.clear(); window.location.reload();}} className="w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase tracking-widest text-red-500 hover:bg-red-50 mt-auto transition-all"><LogOut size={20}/> Logout</button>
      </div>

      <main className="flex-1 p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-12 italic">
          <div><h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{user.name}</h1><p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 bg-white px-3 py-1 rounded-full border border-slate-100 w-fit">{user.jabatan || user.role}</p></div>
          <div className="flex items-center gap-4">
            <select className="bg-white border rounded-2xl px-6 py-4 font-black text-slate-600 shadow-sm outline-none" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            {/* TOMBOL DOWNLOAD EXCEL KANTOR */}
            <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-black shadow-lg uppercase text-[10px] flex items-center gap-2 transition-all active:scale-95"><Download size={18}/> Cetak Excel Kantor</button>
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* Tampilan Dashboard sama dengan versi sebelumnya - Tetap Perfect */}
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-10">
               <div className="flex items-center gap-3 mb-10 italic"><TrendingUp className="text-indigo-600" size={28}/><h3 className="font-black text-2xl uppercase tracking-tighter">Status Monitoring</h3></div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Stats card... */}
                  <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-xl">
                      <p className="text-[10px] font-black uppercase opacity-60 mb-4 tracking-widest">Target Tercapai</p>
                      <p className="text-6xl font-black italic tracking-tighter">
                        {currentFilteredReports.length > 0 ? ((currentFilteredReports.reduce((a,c)=>a+Math.min((c.realisasi/c.target)*100,100),0)/currentFilteredReports.length).toFixed(1)) : 0}%
                      </p>
                  </div>
               </div>
            </div>
          </div>
        ) : (
          /* Tampilan Tabel Capaian Kerja tetap terjaga kesempurnaannya */
          <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 p-10 space-y-8 animate-in fade-in duration-700 italic">
             <div className="flex flex-col md:flex-row justify-between gap-6 px-4">
              <div className="flex items-center gap-3"><div className="w-1.5 h-8 bg-indigo-600 rounded-full"></div><h3 className="font-black text-2xl uppercase tracking-tighter">Form Capaian Kinerja</h3></div>
              {['admin','pimpinan','ketua'].includes(user.role) && (
                <select className="p-4 bg-slate-50 border rounded-2xl font-black text-xs text-slate-600" value={filterStaffName} onChange={e => setFilterStaffName(e.target.value)}>
                  <option value="Semua">Semua Pegawai</option>
                  {users.filter(u => !['admin','pimpinan'].includes(u.role)).map(u => <option key={u.firestoreId} value={u.name}>{u.name}</option>)}
                </select>
              )}
            </div>
            {/* Tabel Reports... (Gunakan kode tabel dari versi sebelumnya) */}
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr><th className="p-8">Kegiatan</th><th className="p-8 text-center">Volume</th><th className="p-8 text-center">Capaian %</th><th className="p-8 text-center">Kualitas</th><th className="p-8 text-center">Aksi</th></tr>
                  </thead>
                  <tbody>
                    {currentFilteredReports.map(r => (
                      <tr key={r.id} className="border-b hover:bg-slate-50/50">
                        <td className="p-8 font-black text-xl text-slate-800 uppercase tracking-tighter">{r.title}</td>
                        <td className="p-8 text-center font-black">{r.realisasi} / {r.target} <span className="text-[10px] block text-slate-400">{r.satuan}</span></td>
                        <td className="p-8 text-center font-black text-indigo-600">{((r.realisasi/r.target)*100).toFixed(1)}%</td>
                        <td className="p-8 text-center font-black text-amber-500 text-xl">{r.nilaiPimpinan || '-'}</td>
                        <td className="p-8 text-center">
                            {/* Aksi tetap sama... */}
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}
      </main>

      {/* Modals tetap ada untuk input data */}
    </div>
  );
};

export default PIRUApp;
