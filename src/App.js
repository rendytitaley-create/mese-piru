import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  serverTimestamp, query, orderBy, deleteDoc, enableIndexedDbPersistence 
} from 'firebase/firestore';
import { 
  ShieldCheck, Loader2, Plus, X, BarChart3, FileText, 
  LogOut, Trash2, Edit3, TrendingUp, Clock, Zap, UserPlus, Users, Download
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

  const handleLogin = (e) => {
    e.preventDefault();
    const inputUsername = authForm.username.trim().toLowerCase();
    const found = users.find(u => u.username.toLowerCase() === inputUsername && u.password === authForm.password);
    if (found) {
      setUser(found);
      localStorage.setItem('piru_session_final', JSON.stringify(found));
    } else { setAuthError('Username atau password salah.'); }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "users"), { 
        ...newUser, 
        role: newUser.role.toLowerCase().trim(), // Paksa huruf kecil
        username: newUser.username.trim().toLowerCase(),
        createdAt: serverTimestamp() 
      });
      setShowUserModal(false);
      setNewUser({ name: '', username: '', password: '', role: 'pegawai', jabatan: '' });
      alert("Pegawai berhasil ditambahkan.");
    } catch (err) { alert("Gagal menambah pegawai."); }
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
        let finalUserRole = user.role.toLowerCase();

        if ((finalUserRole === 'pimpinan' || finalUserRole === 'admin') && newReport.targetUser) {
           const targetStaff = users.find(u => u.name === newReport.targetUser);
           if (targetStaff) {
              finalUserId = targetStaff.username;
              finalUserName = targetStaff.name;
              finalUserRole = targetStaff.role.toLowerCase();
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
    } catch (err) { alert("Data berhasil diproses."); }
  };

  const currentFilteredReports = useMemo(() => {
    let res = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    const role = user?.role?.toLowerCase();
    if (role === 'pegawai') res = res.filter(r => r.userId === user.username);
    if (['pimpinan', 'admin', 'ketua'].includes(role) && filterStaffName !== 'Semua') {
      res = res.filter(r => r.userName === filterStaffName);
    }
    return res;
  }, [reports, user, selectedMonth, selectedYear, filterStaffName]);

  const dashboardStats = useMemo(() => {
    const periodReports = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    const staffSummary = users.filter(u => !['admin','pimpinan'].includes(u.role.toLowerCase())).map(s => {
      const sReports = periodReports.filter(r => r.userId === s.username);
      const total = sReports.length;
      const selesai = sReports.filter(r => r.status === 'selesai').length;
      return { name: s.name, total, detailCount: `${selesai}/${total}` };
    });
    const myReports = periodReports.filter(r => r.userId === user?.username);
    const myTotal = myReports.length;
    return { myTotal, staffSummary };
  }, [reports, users, user, selectedMonth, selectedYear]);

  const exportToExcel = async () => {
    if (filterStaffName === 'Semua' && user.role !== 'pegawai') {
        alert("Pilih satu nama pegawai terlebih dahulu.");
        return;
    }
    const targetStaff = user.role === 'pegawai' ? user : users.find(u => u.name === filterStaffName);
    const pimpinan = users.find(u => u.role.toLowerCase() === 'pimpinan') || { name: '..........................' };
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('CKP');

    sheet.mergeCells('A2:H2');
    const tCell = sheet.getCell('A2');
    tCell.value = `Capaian Kinerja Pegawai Tahun ${selectedYear}`;
    tCell.font = { bold: true, size: 12 };
    tCell.alignment = { horizontal: 'center' };

    const setInfo = (row, l, v) => {
        sheet.getCell(`A${row}`).value = l;
        sheet.getCell(`B${row}`).value = `: ${v}`;
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
    sheet.mergeCells('G9:G9');  sheet.getCell('G9').value = 'Tingkat Kualitas'; sheet.getCell('G10').value = '%';
    sheet.mergeCells('H9:H10'); sheet.getCell('H9').value = 'Keterangan';

    ['A9','B9','C9','D9','G9','H9','D10','E10','F10','G10'].forEach(c => {
        const cell = sheet.getCell(c);
        cell.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFE0E0E0'} };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
    });

    sheet.getColumn(1).width = 8.2;  
    sheet.getColumn(2).width = 60;   
    sheet.getColumn(3).width = 15;   
    sheet.getColumn(4).width = 7.07; 
    sheet.getColumn(5).width = 7.07; 
    sheet.getColumn(6).width = 7.07; 
    sheet.getColumn(7).width = 13;   
    sheet.getColumn(8).width = 45;   

    let curRow = 11;
    let sumKuan = 0; let sumKual = 0;

    currentFilteredReports.forEach((r, i) => {
        const row = sheet.getRow(curRow);
        const kP = (r.realisasi / r.target) * 100;
        const qP = r.nilaiPimpinan || 0;
        row.values = [i+1, r.title, r.satuan, r.target, r.realisasi, kP, qP, r.keterangan || ''];
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
            cell.alignment = { horizontal: (cell.col === 2 || cell.col === 8) ? 'left' : 'center', vertical: 'middle', wrapText: true };
        });
        sumKuan += Math.min(kP, 100); sumKual += qP; curRow++;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `CKP_${targetStaff?.name}.xlsx`);
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

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 font-sans"><Loader2 className="animate-spin text-indigo-600" size={50} /></div>;

  if (!user) return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-4 italic">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-12 shadow-2xl text-center font-sans">
        <ShieldCheck size={45} className="text-indigo-600 mx-auto mb-6" />
        <h1 className="text-4xl font-black mb-1 tracking-tighter text-slate-800 uppercase italic leading-none">PIRU</h1>
        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 leading-none italic">Penilaian Kinerja Bulanan</p>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-10 text-center leading-none italic">BPS Kabupaten Seram Bagian Barat</p>
        <form onSubmit={handleLogin} className="space-y-4 text-left font-sans not-italic">
          <input type="text" placeholder="Username" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none font-bold" onChange={e => setAuthForm({...authForm, username: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none font-bold" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          <button className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-xs mt-4 shadow-lg active:scale-95 transition-all">Login</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden text-slate-800 italic">
      <div className="w-72 bg-white border-r p-8 flex flex-col hidden md:flex font-sans not-italic">
        <div className="flex items-center gap-4 mb-14 px-2 italic">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg"><ShieldCheck size={28}/></div>
          <div><h2 className="font-black text-2xl uppercase tracking-tighter leading-none italic">PIRU</h2><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Penilaian Kinerja Bulanan</p></div>
        </div>
        <nav className="flex-1 space-y-3 font-sans not-italic">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><BarChart3 size={20}/> Dashboard</button>
          <button onClick={() => setActiveTab('laporan')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'laporan' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={20}/> Capaian Kerja</button>
          {user.role.toLowerCase() === 'admin' && (<button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Users size={20}/> Data Pegawai</button>)}
        </nav>
        <button onClick={() => {localStorage.clear(); window.location.reload();}} className="w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase text-red-500 mt-auto transition-all italic"><LogOut size={20}/> Logout</button>
      </div>

      <main className="flex-1 p-10 overflow-y-auto font-sans italic">
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-10 italic">
          <div className="flex-1 max-w-md italic">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none italic break-words">{user.name}</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-3 inline-block bg-white px-4 py-1 rounded-full border border-slate-100 italic">{user.jabatan || user.role}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 not-italic xl:justify-end">
             {/* --- HAK AKSES FILTER: UNTUK ADMIN, PIMPINAN, & KETUA (CASE INSENSITIVE) --- */}
             {['admin', 'pimpinan', 'ketua'].includes(user.role.toLowerCase()) && activeTab === 'laporan' && (
                <select className="p-3 bg-white border border-slate-200 rounded-xl font-black text-[10px] text-slate-600 shadow-sm outline-none" value={filterStaffName} onChange={e => setFilterStaffName(e.target.value)}>
                  <option value="Semua">Semua Pegawai</option>
                  {users.filter(u => !['admin','pimpinan'].includes(u.role.toLowerCase())).map(u => <option key={u.firestoreId} value={u.name}>{u.name}</option>)}
                </select>
              )}
            
            <select className="bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-[10px] text-slate-600 outline-none shadow-sm cursor-pointer" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>

            <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 transition-all active:scale-95 shadow-md italic"><Download size={14}/> Cetak</button>
            <button onClick={() => { resetReportForm(); setShowReportModal(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] transition-all active:scale-95 shadow-lg flex items-center gap-2 italic"><Plus size={14}/> Entri</button>
          </div>
        </header>

        {activeTab === 'laporan' && (
          <div className="bg-white rounded-[3.5rem] shadow-sm border p-10 space-y-8 italic">
            <div className="overflow-x-auto text-sm italic">
              <table className="w-full text-left italic">
                <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                  <tr><th className="p-8 italic">Kegiatan</th><th className="p-8 text-center italic">Volume</th><th className="p-8 text-center italic">Capaian %</th><th className="p-8 text-center italic">Ketua</th><th className="p-8 text-center italic">Pimpinan</th><th className="p-8 text-center italic">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50 italic">
                  {currentFilteredReports.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-all italic">
                      <td className="p-8 italic"><p className="font-black text-xl text-slate-800 uppercase tracking-tighter leading-none mb-2 italic">{r.title}</p><span className="text-indigo-600 text-[9px] font-black uppercase bg-indigo-50 px-2 py-1 rounded-lg italic">{r.userName}</span></td>
                      <td className="p-8 text-center font-black italic">{r.realisasi} / {r.target} <span className="text-[10px] block text-slate-400 lowercase italic">{r.satuan}</span></td>
                      <td className="p-8 text-center font-black text-indigo-600 italic">{((r.realisasi/r.target)*100).toFixed(1)}%</td>
                      <td className="p-8 text-center font-black text-slate-300 text-xl italic">{r.nilaiKetua || '-'}</td>
                      <td className="p-8 text-center font-black text-indigo-600 text-xl italic">{r.nilaiPimpinan || '-'}</td>
                      <td className="p-8 text-center italic">
                        <div className="flex justify-center gap-2 italic">
                          {r.userId === user.username && r.status === 'pending' && <><button onClick={() => { setIsEditing(true); setCurrentReportId(r.id); setNewReport({title: r.title, target: r.target, realisasi: r.realisasi, satuan: r.satuan, keterangan: r.keterangan || ''}); setShowReportModal(true); }} className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl italic"><Edit3 size={18}/></button><button onClick={() => deleteDoc(doc(db, "reports", r.id))} className="p-3 bg-red-50 text-red-400 rounded-2xl italic"><Trash2 size={18}/></button></>}
                          
                          {/* --- TOMBOL NILAI: SYARAT CASE INSENSITIVE --- */}
                          {['ketua', 'admin'].includes(user.role.toLowerCase()) && r.userId !== user.username && (
                            <button onClick={() => submitGrade(r.id, 'ketua')} className="bg-amber-400 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-md active:scale-95 transition-all italic">Ketua</button>
                          )}
                          
                          {['pimpinan', 'admin'].includes(user.role.toLowerCase()) && r.userId !== user.username && (
                            <button onClick={() => submitGrade(r.id, 'pimpinan')} className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-md active:scale-95 transition-all italic">Pimpinan</button>
                          )}
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

      {/* MODAL LAPORAN */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-50 font-sans italic">
          <form onSubmit={handleSubmitReport} className="bg-white w-full max-w-2xl rounded-[3.5rem] p-16 shadow-2xl relative italic">
            <button type="button" onClick={() => { resetReportForm(); setShowReportModal(false); }} className="absolute top-10 right-10 p-4 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all italic"><X size={24}/></button>
            <h3 className="text-4xl font-black uppercase tracking-tighter mb-10 text-slate-800 italic">{isEditing ? "Update Kinerja" : "Form Kinerja"}</h3>
            <div className="space-y-6 italic">
               {(user.role.toLowerCase() === 'pimpinan' || user.role.toLowerCase() === 'admin') && !isEditing && (
                  <select required className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-black text-indigo-600 border border-slate-100 italic" onChange={e => setNewReport({...newReport, targetUser: e.target.value})}>
                        <option value="">-- Pilih Nama Pegawai --</option>
                        {users.filter(u => !['admin','pimpinan'].includes(u.role.toLowerCase())).map(u => <option key={u.firestoreId} value={u.name}>{u.name}</option>)}
                  </select>
               )}
               <input required type="text" placeholder="Nama Pekerjaan" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-black text-slate-800 border border-slate-100 italic" value={newReport.title} onChange={e => setNewReport({...newReport, title: e.target.value})} />
               <div className="grid grid-cols-2 gap-6 italic">
                  <input required type="number" placeholder="Target" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-black text-slate-800 border border-slate-100 italic" value={newReport.target} onChange={e => setNewReport({...newReport, target: e.target.value})} />
                  <input required type="number" placeholder="Realisasi" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-black text-slate-800 border border-slate-100 italic" value={newReport.realisasi} onChange={e => setNewReport({...newReport, realisasi: e.target.value})} />
               </div>
               <input list="satuan-list" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-black text-slate-800 border border-slate-100 italic" placeholder="Satuan" value={newReport.satuan} onChange={e => setNewReport({...newReport, satuan: e.target.value})} />
               <datalist id="satuan-list"><option value="Dokumen"/><option value="Kegiatan"/><option value="Laporan"/><option value="Paket"/><option value="BS"/><option value="Ruta"/></datalist>
               <textarea className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold h-32 resize-none text-slate-600 border border-slate-100 italic" placeholder="Keterangan..." value={newReport.keterangan} onChange={e => setNewReport({...newReport, keterangan: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-7 rounded-[2.5rem] shadow-2xl uppercase tracking-widest text-xs mt-10 transition-all active:scale-95 italic">Simpan Capaian</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PIRUApp;
