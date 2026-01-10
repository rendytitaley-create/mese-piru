import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  serverTimestamp, query, orderBy, deleteDoc, enableIndexedDbPersistence, writeBatch, where, getDocs
} from 'firebase/firestore';
import { 
  ShieldCheck, Loader2, Plus, X, BarChart3, FileText, 
  LogOut, Trash2, Edit3, TrendingUp, Clock, Zap, UserPlus, Users, Download, ClipboardCheck, CheckCircle2,
  LayoutDashboard
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
        await updateDoc(doc(db, "users", currentUserId), { ...newUser, username: newUser.username.trim().toLowerCase() });
        alert("Data pegawai diperbarui.");
      } else {
        await addDoc(collection(db, "users"), { ...newUser, username: newUser.username.trim().toLowerCase(), createdAt: serverTimestamp() });
        alert("Pegawai berhasil ditambahkan.");
      }
      setShowUserModal(false); resetUserForm();
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
      currentFilteredReports.forEach((r) => {
        const ref = doc(db, "reports", r.id);
        if (user.role === 'ketua') batch.update(ref, { nilaiKetua: grade, status: 'dinilai_ketua' });
        else if (user.role === 'pimpinan' || user.role === 'admin') batch.update(ref, { nilaiPimpinan: grade, status: 'selesai' });
      });
      await batch.commit();
      alert(`Berhasil memberikan nilai ke ${currentFilteredReports.length} pekerjaan.`);
    } catch (err) { alert("Gagal melakukan penilaian massal."); }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    try {
      if (isEditing && currentReportId) {
        await updateDoc(doc(db, "reports", currentReportId), { ...newReport, target: Number(newReport.target), realisasi: Number(newReport.realisasi) });
      } else {
        let finalUserId = user.username;
        let finalUserName = user.name;
        let finalUserRole = user.role;
        if (activeTab === 'penilaian' && newReport.targetUser) {
           const targetStaff = users.find(u => u.name === newReport.targetUser);
           if (targetStaff) { finalUserId = targetStaff.username; finalUserName = targetStaff.name; finalUserRole = targetStaff.role; }
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
      await updateDoc(doc(db, "reports", reportId), { [field]: 0, status: field === 'nilaiPimpinan' ? 'dinilai_ketua' : 'pending' });
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

  const exportToExcel = async () => {
    if (filterStaffName === 'Semua' && user.role !== 'pegawai') { alert("Pilih satu nama pegawai terlebih dahulu untuk mencetak CKP."); return; }
    const targetStaff = user.role === 'pegawai' ? user : users.find(u => u.name === filterStaffName);
    const pimpinan = users.find(u => u.role === 'pimpinan') || { name: '..........................' };
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('CKP');
    sheet.mergeCells('A2:H2');
    const titleCell = sheet.getCell('A2');
    titleCell.value = `Capaian Kinerja Pegawai Tahun ${selectedYear}`;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'center' };
    const setInfo = (row, label, value) => {
        sheet.getCell(`A${row}`).value = label;
        sheet.getCell(`B${row}`).value = `: ${value}`;
        sheet.getCell(`A${row}`).font = { bold: true };
    };
    setInfo(4, 'Unit Kerja', 'BPS Kab. Seram Bagian Barat');
    setInfo(5, 'Nama', targetStaff?.name || '');
    setInfo(6, 'Jabatan', targetStaff?.jabatan || '');
    setInfo(7, 'Periode', `1 - ${lastDay} ${monthNames[selectedMonth-1]} ${selectedYear}`);
    sheet.mergeCells('A9:A10'); sheet.getCell('A9').value = 'No';
    sheet.mergeCells('B9:B10'); sheet.getCell('B9').value = 'Uraian Kegiatan';
    sheet.mergeCells('C9:C10'); sheet.getCell('C9').value = 'Satuan';
    sheet.mergeCells('D9:F9');  sheet.getCell('D9').value = 'Kuantitas';
    sheet.getCell('D10').value = 'Target'; sheet.getCell('E10').value = 'Realisasi'; sheet.getCell('F10').value = '%';
    sheet.mergeCells('G9:G10'); sheet.getCell('G9').value = 'Tingkat Kualitas (%)';
    sheet.mergeCells('H9:H10'); sheet.getCell('H9').value = 'Keterangan';
    const headerCells = ['A9','B9','C9','D9','G9','H9','D10','E10','F10'];
    headerCells.forEach(c => {
        const cell = sheet.getCell(c);
        cell.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFE0E0E0'} };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
    });
    sheet.getColumn(1).width = 8.2; sheet.getColumn(2).width = 60; sheet.getColumn(3).width = 15;
    sheet.getColumn(4).width = 7.07; sheet.getColumn(5).width = 7.07; sheet.getColumn(6).width = 7.07;
    sheet.getColumn(7).width = 10; sheet.getColumn(8).width = 45;
    let curRow = 11;
    let sumKuan = 0; let sumKual = 0;
    const dataCount = currentFilteredReports.length;
    currentFilteredReports.forEach((r, i) => {
        const row = sheet.getRow(curRow);
        const kP = (r.realisasi / r.target) * 100;
        const qP = r.nilaiPimpinan || 0;
        row.values = [i+1, r.title, r.satuan, r.target, r.realisasi, kP, qP, r.keterangan || ''];
        row.height = 35;
        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
            cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
            cell.alignment = { vertical: 'middle', wrapText: true, horizontal: (colNum === 2 || colNum === 8) ? 'left' : 'center' };
        });
        sumKuan += Math.min(kP, 100); sumKual += qP; curRow++;
    });
    const avgKuan = dataCount > 0 ? sumKuan / dataCount : 0;
    const avgKual = dataCount > 0 ? sumKual / dataCount : 0;
    sheet.mergeCells(`A${curRow}:E${curRow}`);
    const avgLabel = sheet.getCell(`A${curRow}`);
    avgLabel.value = 'Rata-Rata'; avgLabel.font = { bold: true };
    avgLabel.alignment = { horizontal: 'center', vertical: 'middle' };
    avgLabel.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
    ['F', 'G', 'H'].forEach(col => {
      const c = sheet.getCell(`${col}${curRow}`);
      if(col === 'F') c.value = avgKuan;
      if(col === 'G') c.value = avgKual;
      c.alignment = { horizontal: 'center' };
      c.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
    });
    curRow++;
    sheet.mergeCells(`A${curRow}:E${curRow}`);
    sheet.getCell(`A${curRow}`).value = 'Capaian Kinerja Pegawai (CKP)';
    sheet.getCell(`A${curRow}`).font = { bold: true };
    sheet.mergeCells(`F${curRow}:G${curRow}`);
    const cellFinal = sheet.getCell(`F${curRow}`);
    cellFinal.value = Math.round((avgKuan + avgKual) / 2);
    cellFinal.font = { bold: true };
    cellFinal.alignment = { horizontal: 'center', vertical: 'middle' };
    cellFinal.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
    sheet.getCell(`H${curRow}`).border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
    curRow += 2;
    sheet.mergeCells(`F${curRow}:H${curRow}`);
    sheet.getCell(`F${curRow}`).value = `Penilaian Kinerja : ${lastDay} ${monthNames[selectedMonth-1]} ${selectedYear}`;
    curRow += 2;
    sheet.mergeCells(`F${curRow}:H${curRow}`);
    sheet.getCell(`F${curRow}`).value = 'Pejabat Penilai,';
    curRow += 4;
    sheet.mergeCells(`F${curRow}:H${curRow}`);
    const pimpNameCell = sheet.getCell(`F${curRow}`);
    pimpNameCell.value = pimpinan.name; pimpNameCell.font = { bold: true, underline: true };
    pimpNameCell.alignment = { horizontal: 'center' };
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `CKP_${targetStaff?.name}.xlsx`);
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
    const yearlyReports = reports.filter(r => r.year === selectedYear && r.userId === user?.username);
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
    const isReady = myTotal > 0 && mySelesai === myTotal;
    const currentScore = (myTotal > 0 ? (( (myReports.reduce((a,c)=>a+Math.min((c.realisasi/c.target)*100, 100),0)/myTotal) + (myReports.reduce((a,c)=>a+(Number(c.nilaiPimpinan)||0),0)/myTotal) )/2).toFixed(2) : "0.00");
    const yearlyAvg = yearlyReports.length > 0 ? ( (yearlyReports.reduce((a,c)=>a+Math.min((c.realisasi/c.target)*100, 100),0)/yearlyReports.length) + (yearlyReports.reduce((a,c)=>a+(Number(c.nilaiPimpinan)||0),0)/yearlyReports.length) ) / 2 : 0;
    return { myTotal, myNilaiAkhir: currentScore, isFinal: isReady, myYearly: yearlyAvg.toFixed(2), staffSummary, myStatus: myTotal === 0 ? "N/A" : (mySelesai === myTotal ? "Selesai" : "Progres"), myDetailCount: `${mySelesai}/${myTotal} Selesai` };
  }, [reports, users, user, selectedMonth, selectedYear]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 font-sans"><Loader2 className="animate-spin text-indigo-600" size={50} /></div>;

  if (!user) return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-4 italic">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-12 shadow-2xl text-center font-sans">
        <ShieldCheck size={45} className="text-indigo-600 mx-auto mb-6" />
        <h1 className="text-4xl font-black mb-1 tracking-tighter text-slate-800 uppercase italic leading-none">PIRU</h1>
        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 leading-none italic">Penilaian Kinerja Bulanan</p>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-10 text-center leading-none italic">BPS Kabupaten Seram Bagian Barat</p>
        <form onSubmit={handleLogin} className="space-y-4 text-left font-sans not-italic">
          <input type="text" placeholder="Username" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none font-bold" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none font-bold" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          <button className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-xs mt-4 transition-all active:scale-95 shadow-lg">Login</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row font-sans overflow-hidden text-slate-800 italic">
      {/* SIDEBAR DESKTOP - HIDDEN ON MOBILE */}
      <div className="hidden md:flex w-72 bg-white border-r p-8 flex-col font-sans h-full sticky top-0 not-italic">
        <div className="flex items-center gap-4 mb-14 px-2 italic">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg"><ShieldCheck size={28}/></div>
          <div><h2 className="font-black text-2xl uppercase tracking-tighter leading-none italic">PIRU</h2><p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest mt-1 italic">Penilaian Kinerja Bulanan</p></div>
        </div>
        <nav className="flex-1 space-y-3 font-sans not-italic">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutDashboard size={20}/> Dashboard</button>
          {user.role !== 'admin' && (<button onClick={() => setActiveTab('laporan')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'laporan' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={20}/> Entri Pekerjaan</button>)}
          {['admin', 'pimpinan', 'ketua'].includes(user.role) && (<button onClick={() => setActiveTab('penilaian')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'penilaian' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><ClipboardCheck size={20}/> Penilaian Anggota</button>)}
          {user.role === 'admin' && (<button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Users size={20}/> Data Pegawai</button>)}
        </nav>
        <button onClick={() => {localStorage.clear(); window.location.reload();}} className="w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase text-red-500 mt-auto transition-all italic"><LogOut size={20}/> Logout</button>
      </div>

      <main className="flex-1 flex flex-col h-screen overflow-hidden font-sans italic relative">
        <header className="p-6 md:p-10 pb-4 flex flex-row justify-between items-center italic sticky top-0 bg-slate-50 z-20">
          <div className="flex-1 max-w-md italic">
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none italic break-words">{user.name}</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px] mt-2 inline-block bg-white px-3 py-1 rounded-full border border-slate-100 italic">{user.jabatan || user.role}</p>
          </div>
          {/* LOGOUT BUTTON FOR MOBILE ONLY */}
          <button onClick={() => {localStorage.clear(); window.location.reload();}} className="md:hidden p-2 text-red-500 transition-all active:scale-90 italic"><LogOut size={22}/></button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 pt-0 custom-scrollbar mb-20 md:mb-0">
          {/* COMMON FILTER AREA */}
          <div className="mb-6 flex flex-wrap items-center gap-3 not-italic">
             {activeTab === 'penilaian' && (
                <select className="flex-1 md:flex-none p-2 bg-white border border-slate-200 rounded-xl font-black text-[10px] text-slate-600 shadow-sm outline-none italic" value={filterStaffName} onChange={e => setFilterStaffName(e.target.value)}>
                  <option value="Semua">Semua Pegawai</option>
                  {users.filter(u => !['admin', 'pimpinan'].includes(u.role)).map(u => <option key={u.firestoreId} value={u.name}>{u.name}</option>)}
                </select>
              )}
            <select className="flex-1 md:flex-none bg-white border border-slate-200 rounded-xl px-3 py-2 font-black text-[10px] text-slate-600 outline-none shadow-sm cursor-pointer italic" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>

          {/* DYNAMIC "NILAI SEMUA" BUTTON */}
          {activeTab === 'penilaian' && filterStaffName !== 'Semua' && (
            <button onClick={handleNilaiSemua} className="w-full md:w-auto mb-6 bg-amber-500 text-white px-5 py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg italic transition-all active:scale-95"><CheckCircle2 size={18}/> Nilai Semua Pekerjaan {filterStaffName}</button>
          )}

          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in duration-500 italic space-y-6">
              {['admin', 'pimpinan'].includes(user.role) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {dashboardStats.staffSummary.map((s, i) => (
                    <div key={i} className="bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl italic flex flex-col items-center text-center">
                      <div className="bg-slate-800 p-4 rounded-3xl mb-6"><Users size={24} className="text-indigo-400"/></div>
                      <p className="font-black text-xl text-white uppercase tracking-tighter leading-none mb-2 italic">{s.name}</p>
                      <span className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-full mb-6 ${s.status === 'Selesai' ? 'bg-green-900/40 text-green-400' : 'bg-amber-900/40 text-amber-400'}`}>{s.status}</span>
                      <div className="w-full border-t border-slate-800 pt-6 mt-auto">
                        <p className="text-[9px] font-black text-slate-500 uppercase italic mb-1">Capaian Akhir</p>
                        <p className="text-4xl font-black text-indigo-400 italic">{s.nilaiAkhir}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                  <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl border border-slate-800 flex flex-col items-center text-center group">
                    <div className="bg-amber-500/10 p-5 rounded-3xl mb-8"><TrendingUp size={32} className="text-amber-500"/></div>
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-2 tracking-[0.2em] italic">{dashboardStats.isFinal ? "Nilai Akhir Capaian" : "Estimasi Nilai Akhir"}</p>
                    <p className="text-6xl md:text-7xl font-black text-amber-500 tracking-tighter italic mb-8">{dashboardStats.myNilaiAkhir}</p>
                    <div className="w-full border-t border-slate-800 pt-8 mt-auto flex flex-col items-center">
                       <p className="text-[9px] font-black text-slate-500 uppercase italic mb-2 tracking-widest">{dashboardStats.myStatus}</p>
                    </div>
                  </div>
                  <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl border border-slate-800 flex flex-col items-center text-center group">
                    <div className="bg-indigo-500/10 p-5 rounded-3xl mb-8"><BarChart3 size={32} className="text-indigo-400"/></div>
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-2 tracking-[0.2em] italic">Akumulasi Capaian {selectedYear}</p>
                    <p className="text-6xl md:text-7xl font-black text-indigo-400 tracking-tighter italic mb-8">{dashboardStats.myYearly}</p>
                    <div className="w-full border-t border-slate-800 pt-8 mt-auto">
                       <p className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest leading-none">Rata-rata Kumulatif</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'laporan' || activeTab === 'penilaian') && (
            <div className="italic">
              {/* DESKTOP TABLE - HIDDEN ON MOBILE */}
              <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border p-6 overflow-hidden">
                <table className="w-full text-left italic text-xs border-collapse">
                  <thead className="bg-slate-50 border-b text-[9px] font-black text-slate-400 uppercase tracking-widest italic sticky top-0 z-10">
                    <tr><th className="p-4 w-12 text-center">No</th><th>Uraian Pekerjaan</th><th className="w-24 text-center">Satuan</th><th className="text-center w-28">Volume</th><th className="text-center w-16">Cap%</th><th className="text-center w-16">Ketua</th><th className="text-center w-16">Pimp</th><th className="text-center w-24">Aksi</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 italic">
                    {currentFilteredReports.map((r, idx) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-all italic group">
                        <td className="p-4 font-bold text-slate-400 text-center">{idx + 1}</td>
                        <td className="p-4 italic"><p className="font-black text-[12px] text-slate-800 uppercase tracking-tight leading-none mb-1 italic">{r.title}</p><span className="text-indigo-600 text-[8px] font-black uppercase bg-indigo-50 px-2 py-0.5 rounded-lg italic">{r.userName}</span></td>
                        <td className="p-4 text-center font-bold text-slate-500 uppercase text-[10px] italic">{r.satuan || '-'}</td>
                        <td className="p-4 text-center font-black italic">{r.realisasi} / {r.target}</td>
                        <td className="p-4 text-center font-black text-indigo-600 italic">{((r.realisasi/r.target)*100).toFixed(0)}%</td>
                        <td className="p-4 text-center font-black text-slate-300 text-lg relative italic"><div className="relative group inline-block">{r.nilaiKetua || '-'}{user.role === 'admin' && activeTab === 'penilaian' && r.nilaiKetua > 0 && (<button onClick={() => clearGrade(r.id, 'nilaiKetua')} className="absolute -top-1 -right-3 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-all italic"><Trash2 size={10}/></button>)}</div></td>
                        <td className="p-4 text-center font-black text-indigo-600 text-lg relative italic"><div className="relative group inline-block">{r.nilaiPimpinan || '-'}{user.role === 'admin' && activeTab === 'penilaian' && r.nilaiPimpinan > 0 && (<button onClick={() => clearGrade(r.id, 'nilaiPimpinan')} className="absolute -top-1 -right-3 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-all italic"><Trash2 size={10}/></button>)}</div></td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-1 italic">
                            {activeTab === 'laporan' && r.status === 'pending' && <><button onClick={() => { setIsEditing(true); setCurrentReportId(r.id); setNewReport({title: r.title, target: r.target, realisasi: r.realisasi, satuan: r.satuan, keterangan: r.keterangan || ''}); setShowReportModal(true); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl italic"><Edit3 size={14}/></button><button onClick={() => deleteDoc(doc(db, "reports", r.id))} className="p-2 bg-red-50 text-red-400 rounded-xl italic"><Trash2 size={14}/></button></>}
                            {activeTab === 'penilaian' && (<>{['ketua', 'admin'].includes(user.role) && <button onClick={() => submitGrade(r.id, 'ketua')} className="bg-amber-400 text-white px-3 py-1.5 rounded-xl text-[8px] font-black uppercase italic shadow-sm">Ketua</button>}{['pimpinan', 'admin'].includes(user.role) && <button onClick={() => submitGrade(r.id, 'pimpinan')} className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[8px] font-black uppercase italic shadow-sm">Pimp</button>}</>)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CARD VIEW MOBILE - HIDDEN ON DESKTOP */}
              <div className="md:hidden space-y-4">
                {currentFilteredReports.map((r, idx) => (
                  <div key={r.id} className="bg-white p-6 rounded-[2.2rem] shadow-sm border border-slate-100 italic">
                    <div className="flex justify-between items-start mb-2 italic">
                      <span className="text-[10px] font-black text-indigo-600 uppercase italic">#{idx + 1} - {r.satuan || 'Pekerjaan'}</span>
                      {activeTab === 'laporan' && r.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => { setIsEditing(true); setCurrentReportId(r.id); setNewReport({title: r.title, target: r.target, realisasi: r.realisasi, satuan: r.satuan, keterangan: r.keterangan || ''}); setShowReportModal(true); }} className="text-indigo-400 p-1"><Edit3 size={18}/></button>
                          <button onClick={() => deleteDoc(doc(db, "reports", r.id))} className="text-red-400 p-1"><Trash2 size={18}/></button>
                        </div>
                      )}
                    </div>
                    <h3 className="font-black text-slate-800 uppercase text-sm mb-4 leading-tight italic">{r.title}</h3>
                    <div className="grid grid-cols-2 gap-4 border-t pt-4 italic">
                      <div><p className="text-[8px] text-slate-400 uppercase font-black italic">Target/Real</p><p className="font-black text-xs italic">{r.realisasi} / {r.target}</p></div>
                      <div><p className="text-[8px] text-slate-400 uppercase font-black italic">Capaian</p><p className="font-black text-xs text-indigo-600 italic">{((r.realisasi/r.target)*100).toFixed(0)}%</p></div>
                      <div><p className="text-[8px] text-slate-400 uppercase font-black italic">Nilai Ketua</p><p className="font-black text-sm text-amber-500 italic">{r.nilaiKetua || '-'}</p></div>
                      <div><p className="text-[8px] text-slate-400 uppercase font-black italic">Nilai Pimp</p><p className="font-black text-sm text-indigo-600 italic">{r.nilaiPimpinan || '-'}</p></div>
                    </div>
                    {activeTab === 'penilaian' && (
                      <div className="flex gap-2 mt-4 italic">
                        {['ketua', 'admin'].includes(user.role) && <button onClick={() => submitGrade(r.id, 'ketua')} className="flex-1 py-3 bg-amber-400 text-white rounded-xl font-black text-[9px] uppercase italic">Nilai Ketua</button>}
                        {['pimpinan', 'admin'].includes(user.role) && <button onClick={() => submitGrade(r.id, 'pimpinan')} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase italic">Nilai Pimp</button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden p-6 font-sans italic">
              <table className="w-full text-left font-sans italic text-xs">
                <thead><tr className="bg-slate-50 border-b text-[9px] font-black text-slate-400 uppercase tracking-widest"><th className="p-4 italic">Pegawai</th><th className="p-4 text-center italic">Aksi</th></tr></thead>
                <tbody>{users.map(u => (<tr key={u.firestoreId} className="border-b hover:bg-slate-50 italic"><td className="p-4 italic"><p className="font-black text-slate-800 uppercase italic">{u.name}</p><p className="text-indigo-500 text-[8px] italic">{u.jabatan} / {u.role}</p></td><td className="p-4 text-center">
                  <div className="flex justify-center gap-2 italic">
                    <button onClick={() => { setIsEditingUser(true); setCurrentUserId(u.firestoreId); setNewUser({ name: u.name, username: u.username, password: u.password, role: u.role, jabatan: u.jabatan }); setShowUserModal(true); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl italic"><Edit3 size={14}/></button>
                    <button onClick={() => deleteDoc(doc(db, "users", u.firestoreId))} className="p-2 bg-red-50 text-red-400 rounded-xl italic"><Trash2 size={16}/></button>
                  </div>
                </td></tr>))}</tbody>
              </table>
              <button onClick={() => { resetUserForm(); setShowUserModal(true); }} className="mt-4 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] italic shadow-lg italic">+ Tambah Pegawai</button>
            </div>
          )}
        </div>

        {/* BOTTOM NAVIGATION MOBILE ONLY */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-around items-center z-40 not-italic shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-indigo-600 scale-105' : 'text-slate-300'}`}><LayoutDashboard size={22}/><span className="text-[7px] font-black uppercase">Home</span></button>
          {user.role !== 'admin' && (<button onClick={() => setActiveTab('laporan')} className={`flex flex-col items-center gap-1 ${activeTab === 'laporan' ? 'text-indigo-600 scale-105' : 'text-slate-300'}`}><FileText size={22}/><span className="text-[7px] font-black uppercase">Entri</span></button>)}
          {['admin', 'pimpinan', 'ketua'].includes(user.role) && (<button onClick={() => setActiveTab('penilaian')} className={`flex flex-col items-center gap-1 ${activeTab === 'penilaian' ? 'text-indigo-600 scale-105' : 'text-slate-300'}`}><ClipboardCheck size={22}/><span className="text-[7px] font-black uppercase">Nilai</span></button>)}
          {user.role === 'admin' && (<button onClick={() => setActiveTab('users')} className={`flex flex-col items-center gap-1 ${activeTab === 'users' ? 'text-indigo-600 scale-105' : 'text-slate-300'}`}><Users size={22}/><span className="text-[7px] font-black uppercase">Pegawai</span></button>)}
        </div>
      </main>

      {/* MODAL LAPORAN */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-50 font-sans italic">
          <form onSubmit={handleSubmitReport} className="bg-white w-full max-w-2xl rounded-[3rem] p-8 md:p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto italic">
            <button type="button" onClick={() => { resetReportForm(); setShowReportModal(false); }} className="absolute top-6 right-6 p-3 bg-slate-50 rounded-full text-slate-400 italic"><X size={20}/></button>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 text-slate-800 italic">{isEditing ? "Update Pekerjaan" : (activeTab === 'penilaian' ? "Entri Anggota" : "Entri Pekerjaan")}</h3>
            <div className="space-y-4 italic">
               {activeTab === 'penilaian' && !isEditing && (
                  <select required className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-indigo-600 border border-slate-100 italic" value={newReport.targetUser} onChange={e => setNewReport({...newReport, targetUser: e.target.value})}>
                        <option value="">-- Pilih Nama Pegawai --</option>
                        {users.filter(u => !['admin', 'pimpinan'].includes(u.role)).map(u => <option key={u.firestoreId} value={u.name}>{u.name}</option>)}
                  </select>
               )}
               <input required type="text" placeholder="Uraian Pekerjaan" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-800 border border-slate-100 italic" value={newReport.title} onChange={e => setNewReport({...newReport, title: e.target.value})} />
               <div className="grid grid-cols-2 gap-4 italic">
                  <input required type="number" placeholder="Target" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-800 border border-slate-100 italic" value={newReport.target} onChange={e => setNewReport({...newReport, target: e.target.value})} />
                  <input required type="number" placeholder="Realisasi" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-800 border border-slate-100 italic" value={newReport.realisasi} onChange={e => setNewReport({...newReport, realisasi: e.target.value})} />
               </div>
               <input list="satuan-list" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-800 border border-slate-100 italic" placeholder="Satuan" value={newReport.satuan} onChange={e => setNewReport({...newReport, satuan: e.target.value})} />
               <datalist id="satuan-list"><option value="Dokumen"/><option value="Kegiatan"/><option value="Laporan"/><option value="Paket"/></datalist>
               <textarea className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold h-24 resize-none text-slate-600 border border-slate-100 italic" placeholder="Keterangan..." value={newReport.keterangan} onChange={e => setNewReport({...newReport, keterangan: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-[10px] mt-6 italic">Simpan Data</button>
          </form>
        </div>
      )}

      {/* MODAL USER */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-50 font-sans italic">
          <form onSubmit={handleAddOrEditUser} className="bg-white w-full max-w-xl rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative italic">
            <button type="button" onClick={() => { setShowUserModal(false); resetUserForm(); }} className="absolute top-6 right-6 p-3 bg-slate-50 rounded-full text-slate-400 italic"><X size={20}/></button>
            <h3 className="text-xl font-black uppercase tracking-tighter mb-8 text-slate-800 italic">{isEditingUser ? "Edit Akun" : "Tambah Pegawai"}</h3>
            <div className="space-y-4 italic">
                <input required type="text" placeholder="Nama Lengkap" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 border border-slate-100 italic" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4 italic">
                    <input required type="text" placeholder="Username" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 border border-slate-100 italic" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                    <input required type="password" placeholder="Password" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 border border-slate-100 italic" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                </div>
                <input type="text" placeholder="Jabatan" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 border border-slate-100 italic" value={newUser.jabatan} onChange={e => setNewUser({...newUser, jabatan: e.target.value})} />
                <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-600 border border-slate-100 italic" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                    <option value="pegawai">Pegawai</option><option value="ketua">Ketua Tim</option><option value="pimpinan">Pimpinan</option><option value="admin">Admin</option>
                </select>
                <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-[10px] mt-6 italic transition-all active:scale-95">Simpan Pegawai</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PIRUApp;
