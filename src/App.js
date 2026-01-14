import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  serverTimestamp, query, orderBy, deleteDoc, enableIndexedDbPersistence, writeBatch, setDoc
} from 'firebase/firestore';
import { 
  ShieldCheck, Loader2, Plus, X, BarChart3, FileText, 
  LogOut, Trash2, Edit3, TrendingUp, Clock, Zap, UserPlus, Users, Download, ClipboardCheck, CheckCircle2,
  LayoutDashboard, User, Camera, KeyRound, AlertCircle, Eye, EyeOff, Image as ImageIcon, Link, Copy, ExternalLink, Search, FileSpreadsheet
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
  const [kjkData, setKjkData] = useState([]); 
  const [appSettings, setAppSettings] = useState({ logoURL: null });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterStaffName, setFilterStaffName] = useState('Semua');
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [newPasswordData, setNewPasswordData] = useState({ current: '', new: '' });

  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [currentReportId, setCurrentReportId] = useState(null);
  const [newReport, setNewReport] = useState({ title: '', target: '', realisasi: '', satuan: '', keterangan: '', targetUser: '' });
  
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'pegawai', jabatan: '', photoURL: '' });

  const [tempLinks, setTempLinks] = useState({});

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
    const unsubSettings = onSnapshot(doc(db, "settings", "app"), (docSnap) => {
      if (docSnap.exists()) setAppSettings(docSnap.data());
    });
    const unsubKJK = onSnapshot(collection(db, "kjk"), (snap) => {
      setKjkData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubAuth(); unsubUsers(); unsubSettings(); unsubKJK(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsubReports = onSnapshot(q, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubReports();
  }, [user]);

  // UTILITY: Ambil kata pertama untuk pencocokan nama yang fleksibel
  const getFirstWord = (name) => {
    if (!name) return "";
    return name.trim().split(" ")[0].toLowerCase();
  };

  const formatKJKDisplay = (timeStr) => {
    if (!timeStr || timeStr === '00:00' || timeStr === '00:00:00') return "Nol KJK";
    const parts = timeStr.split(':').map(Number);
    const hrs = parts[0] || 0;
    const mins = parts[1] || 0;
    
    let result = [];
    if (hrs > 0) result.push(`${hrs} jam`);
    if (mins > 0) result.push(`${mins} menit`);
    return result.join(' ') || "0 menit";
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    const hrs = parts[0] || 0;
    const mins = parts[1] || 0;
    return (hrs * 60) + mins;
  };

  const motivationalWords = [
    "Luar Biasa! Disiplin Sempurna! 🌟",
    "Pertahankan! Nol Kekurangan Jam Kerja. ✅",
    "Disiplin adalah kunci kesuksesan! 🚀",
    "Anda Teladan Kedisiplinan! 🏆"
  ];

  const getMotivation = (name) => {
    const seed = name.length % motivationalWords.length;
    return motivationalWords[seed];
  };

  const handleUploadKJK = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        await workbook.xlsx.load(event.target.result);
        const sheet = workbook.worksheets[0];
        const batch = writeBatch(db);
        
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) { 
            const nama = row.getCell(2).value?.toString().trim();
            const cellKJK = row.getCell(3);
            let kjkVal = "00:00";

            if (nama) {
              if (cellKJK.type === ExcelJS.ValueType.Date) {
                const dateVal = new Date(cellKJK.value);
                const hrs = dateVal.getUTCHours().toString().padStart(2, '0');
                const mins = dateVal.getUTCMinutes().toString().padStart(2, '0');
                kjkVal = `${hrs}:${mins}`;
              } else if (typeof cellKJK.value === 'number') {
                const totalMinutes = Math.round(cellKJK.value * 24 * 60);
                const hrs = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
                const mins = (totalMinutes % 60).toString().padStart(2, '0');
                kjkVal = `${hrs}:${mins}`;
              } else {
                const strVal = cellKJK.value?.toString().trim() || "00:00";
                const parts = strVal.split(':');
                if (parts.length >= 2) {
                  kjkVal = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
                }
              }

              const docId = `${selectedYear}_${selectedMonth}_${nama.replace(/\s+/g, '_').toLowerCase()}`;
              const kjkRef = doc(db, "kjk", docId);
              batch.set(kjkRef, {
                nama,
                kjkValue: kjkVal,
                month: selectedMonth,
                year: selectedYear,
                updatedAt: serverTimestamp()
              }, { merge: true });
            }
          }
        });

        await batch.commit();
        alert(`Data KJK Berhasil Diperbarui untuk ${selectedMonth}/${selectedYear}`);
      } catch (err) {
        console.error(err);
        alert("Gagal membaca file Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        let width = img.width; let height = img.height;
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/png', 0.8);
        try {
          await setDoc(doc(db, "settings", "app"), { logoURL: base64 }, { merge: true });
          alert("Logo aplikasi berhasil diperbarui secara global.");
        } catch (err) { alert("Gagal mengunggah logo."); }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; const MAX_HEIGHT = 400;
        let width = img.width; let height = img.height;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        setNewUser({ ...newUser, photoURL: base64 });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setAuthError('');
    const inputUsername = authForm.username.trim().toLowerCase();
    const found = users.find(u => u.username.toLowerCase() === inputUsername && u.password === authForm.password);
    if (found) {
      setUser(found);
      localStorage.setItem('piru_session_final', JSON.stringify(found));
    } else { setAuthError('Username atau password salah.'); }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPasswordData.current !== user.password) { alert("Password lama tidak sesuai."); return; }
    try {
      const userRef = doc(db, "users", user.firestoreId);
      await updateDoc(userRef, { password: newPasswordData.new });
      const updatedUser = { ...user, password: newPasswordData.new };
      setUser(updatedUser);
      localStorage.setItem('piru_session_final', JSON.stringify(updatedUser));
      alert("Password berhasil diperbarui.");
      setShowPasswordModal(false);
      setNewPasswordData({ current: '', new: '' });
    } catch (err) { alert("Gagal memperbarui password."); }
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

  const resetReportForm = () => { setIsEditing(false); setCurrentReportId(null); setNewReport({ title: '', target: '', realisasi: '', satuan: '', keterangan: '', targetUser: '' }); };
  const resetUserForm = () => { setIsEditingUser(false); setCurrentUserId(null); setNewUser({ name: '', username: '', password: '', role: 'pegawai', jabatan: '', photoURL: '' }); };

  const handleNilaiSemua = async () => {
    if (filterStaffName === 'Semua') return;
    const val = prompt(`Masukkan nilai untuk SEMUA pekerjaan ${filterStaffName} bulan ini:`);
    if (!val || isNaN(val)) return;
    const grade = parseFloat(val);
    if (!window.confirm(`Berikan nilai ${grade} ke seluruh pekerjaan ${filterStaffName}?`)) return;
    try {
      const batch = writeBatch(db);
      currentFilteredReports.forEach((r) => {
        const ref = doc(db, "reports", r.id);
        if (user.role === 'ketua') batch.update(ref, { nilaiKetua: grade, status: 'dinilai_ketua' });
        else if (user.role === 'pimpinan' || user.role === 'admin') batch.update(ref, { nilaiPimpinan: grade, status: 'selesai' });
      });
      await batch.commit(); alert(`Berhasil memberikan nilai.`);
    } catch (err) { alert("Gagal melakukan penilaian massal."); }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    try {
      if (isEditing && currentReportId) {
        await updateDoc(doc(db, "reports", currentReportId), { ...newReport, target: Number(newReport.target), realisasi: Number(newReport.realisasi) });
      } else {
        let finalUserId = user.username; let finalUserName = user.name; let finalUserRole = user.role;
        if (activeTab === 'penilaian' && newReport.targetUser) {
           const targetStaff = users.find(u => u.name === newReport.targetUser);
           if (targetStaff) { finalUserId = targetStaff.username; finalUserName = targetStaff.name; finalUserRole = targetStaff.role; }
        }
        await addDoc(collection(db, "reports"), {
          ...newReport, target: Number(newReport.target), realisasi: Number(newReport.realisasi),
          userId: finalUserId, userName: finalUserName, userRole: finalUserRole,
          month: selectedMonth, year: selectedYear, status: 'pending', nilaiKetua: 0, nilaiPimpinan: 0, createdAt: serverTimestamp()
        });
      }
      setShowReportModal(false); resetReportForm();
    } catch (err) { alert("Data berhasil disimpan."); }
  };

  const clearGrade = async (reportId, field) => {
    if (!window.confirm(`Hapus nilai ${field === 'nilaiKetua' ? 'Ketua' : 'Pimpinan'} ini?`)) return;
    try {
      await updateDoc(doc(db, "reports", reportId), { [field]: 0, status: 'pending' });
      alert("Nilai berhasil dihapus.");
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

  const handleUpdateLinkDrive = async (reportId) => {
    const link = tempLinks[reportId];
    if (!link) { alert("Masukkan link terlebih dahulu."); return; }
    try {
      await updateDoc(doc(db, "reports", reportId), { linkDrive: link });
      alert("Link bukti dukung berhasil diperbarui.");
    } catch (err) { alert("Gagal memperbarui link."); }
  };

  const exportToExcel = async () => {
    if (filterStaffName === 'Semua' && user.role !== 'pegawai') { alert("Pilih satu nama pegawai terlebih dahulu untuk mencetak CKP."); return; }
    const targetStaff = user.role === 'pegawai' ? user : users.find(u => u.name === filterStaffName);
    const pimpinan = users.find(u => u.role === 'pimpinan') || { name: '..........................' };
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('CKP');
    sheet.mergeCells('A2:H2'); const titleCell = sheet.getCell('A2'); titleCell.value = `Capaian Kinerja Pegawai Tahun ${selectedYear}`; titleCell.font = { bold: true, size: 12 }; titleCell.alignment = { horizontal: 'center' };
    const setInfo = (row, label, value) => { sheet.getCell(`A${row}`).value = label; sheet.getCell(`B${row}`).value = `: ${value}`; sheet.getCell(`A${row}`).font = { bold: true }; };
    setInfo(4, 'Unit Kerja', 'BPS Kab. Seram Bagian Barat'); setInfo(5, 'Nama', targetStaff?.name || ''); setInfo(6, 'Jabatan', targetStaff?.jabatan || ''); setInfo(7, 'Periode', `1 - ${lastDay} ${monthNames[selectedMonth-1]} ${selectedYear}`);
    sheet.mergeCells('A9:A10'); sheet.getCell('A9').value = 'No'; sheet.mergeCells('B9:B10'); sheet.getCell('B9').value = 'Uraian Kegiatan'; sheet.mergeCells('C9:C10'); sheet.getCell('C9').value = 'Satuan'; sheet.mergeCells('D9:F9'); sheet.getCell('D9').value = 'Kuantitas'; sheet.getCell('D10').value = 'Target'; sheet.getCell('E10').value = 'Realisasi'; sheet.getCell('F10').value = '%'; sheet.mergeCells('G9:G10'); sheet.getCell('G9').value = 'Tingkat Kualitas (%)'; sheet.mergeCells('H9:H10'); sheet.getCell('H9').value = 'Keterangan';
    const headerCells = ['A9','B9','C9','D9','G9','H9','D10','E10','F10']; headerCells.forEach(c => { const cell = sheet.getCell(c); cell.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFE0E0E0'} }; cell.font = { bold: true }; cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} }; });
    sheet.getColumn(1).width = 8.2; sheet.getColumn(2).width = 60; sheet.getColumn(3).width = 15; sheet.getColumn(4).width = 7.07; sheet.getColumn(5).width = 7.07; sheet.getColumn(6).width = 7.07; sheet.getColumn(7).width = 10; sheet.getColumn(8).width = 45;
    let curRow = 11; let sumKuan = 0; let sumKual = 0; const dataCount = currentFilteredReports.length;
    currentFilteredReports.forEach((r, i) => {
        const row = sheet.getRow(curRow); const kP = (r.realisasi / r.target) * 100; const qP = r.nilaiPimpinan || 0;
        row.values = [i+1, r.title, r.satuan, r.target, r.realisasi, kP, qP, r.keterangan || '']; row.height = 35;
        row.eachCell({ includeEmpty: true }, (cell, colNum) => { cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} }; cell.alignment = { vertical: 'middle', wrapText: true, horizontal: (colNum === 2 || colNum === 8) ? 'left' : 'center' }; });
        sumKuan += Math.min(kP, 100); sumKual += qP; curRow++;
    });
    const avgKuan = dataCount > 0 ? sumKuan / dataCount : 0; const avgKual = dataCount > 0 ? sumKual / dataCount : 0;
    sheet.mergeCells(`A${curRow}:E${curRow}`); const avgLabel = sheet.getCell(`A${curRow}`); avgLabel.value = 'Rata-Rata'; avgLabel.font = { bold: true }; avgLabel.alignment = { horizontal: 'center', vertical: 'middle' };
    const cellF = sheet.getCell(`F${curRow}`); cellF.value = avgKuan; cellF.alignment = { horizontal: 'center', vertical: 'middle' };
    const cellG = sheet.getCell(`G${curRow}`); cellG.value = avgKual; cellG.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let i = 1; i <= 8; i++) { sheet.getRow(curRow).getCell(i).border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} }; }
    curRow++;
    sheet.mergeCells(`A${curRow}:E${curRow}`); const ckpLabel = sheet.getCell(`A${curRow}`); ckpLabel.value = 'Capaian Kinerja Pegawai (CKP)'; ckpLabel.font = { bold: true }; ckpLabel.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.mergeCells(`F${curRow}:G${curRow}`); const cellFinal = sheet.getCell(`F${curRow}`); cellFinal.value = Math.round((avgKuan + avgKual) / 2); cellFinal.font = { bold: true }; cellFinal.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let i = 1; i <= 8; i++) { sheet.getRow(curRow).getCell(i).border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} }; }
    curRow += 2; sheet.mergeCells(`F${curRow}:H${curRow}`); const tglCell = sheet.getCell(`F${curRow}`); tglCell.value = `Penilaian Kinerja : ${lastDay} ${monthNames[selectedMonth-1]} ${selectedYear}`; tglCell.alignment = { horizontal: 'center' };
    curRow += 2; sheet.mergeCells(`F${curRow}:H${curRow}`); const pimpLabel = sheet.getCell(`F${curRow}`); pimpLabel.value = 'Pejabat Penilai,'; pimpLabel.alignment = { horizontal: 'center' };
    curRow += 4; sheet.mergeCells(`F${curRow}:H${curRow}`); const pimpNameCell = sheet.getCell(`F${curRow}`); pimpNameCell.value = pimpinan.name; pimpNameCell.font = { bold: true, underline: true }; pimpNameCell.alignment = { horizontal: 'center' };
    const buffer = await workbook.xlsx.writeBuffer(); saveAs(new Blob([buffer]), `CKP_${targetStaff?.name}_${monthNames[selectedMonth-1]}.xlsx`);
  };

  const currentFilteredReports = useMemo(() => {
    let res = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    if (activeTab === 'laporan') {
      res = res.filter(r => r.userId === user.username);
    }
    if (activeTab === 'bukti_dukung') {
       if (user.role === 'pegawai') {
          res = res.filter(r => r.userId === user.username);
       } else {
          if (filterStaffName === 'Semua') {
             res = res.filter(r => r.userId === user.username);
          } else {
             res = res.filter(r => r.userName === filterStaffName);
          }
       }
    }
    if (activeTab === 'penilaian' && filterStaffName !== 'Semua') { 
      res = res.filter(r => r.userName === filterStaffName); 
    }
    return res;
  }, [reports, user, selectedMonth, selectedYear, filterStaffName, activeTab]);

  const dashboardStats = useMemo(() => {
    const periodReports = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    const yearlyReports = reports.filter(r => r.year === selectedYear && r.userId === user?.username);
    const currentKJK = kjkData.filter(k => k.month === selectedMonth && k.year === selectedYear);

    const staffSummary = users.filter(u => u.role !== 'admin' && u.role !== 'pimpinan').map(s => {
      const sReports = periodReports.filter(r => r.userId === s.username);
      const total = sReports.length; const selesai = sReports.filter(r => r.status === 'selesai').length; const progress = sReports.filter(r => r.status === 'dinilai_ketua').length;
      let statusText = total === 0 ? "Belum Lapor" : (selesai === total ? "Selesai" : (progress > 0 || selesai > 0 ? "Menunggu Penilaian" : "Belum Dinilai"));
      const avgCap = total > 0 ? (sReports.reduce((acc, curr) => acc + Math.min((curr.realisasi / curr.target) * 100, 100), 0) / total) : 0;
      const avgPimp = total > 0 ? (sReports.reduce((acc, curr) => acc + (Number(curr.nilaiPimpinan) || 0), 0) / total) : 0;
      const score = (avgCap + avgPimp) / 2;
      
      // LOGIKA PENCARIAN NAMA DEPAN (FIRST WORD MATCH)
      const sFirstWord = getFirstWord(s.name);
      const kjkObj = currentKJK.find(k => getFirstWord(k.nama) === sFirstWord);
      
      const kjkTime = kjkObj ? kjkObj.kjkValue : '00:00';
      const kjkMins = timeToMinutes(kjkTime);

      return { 
        name: s.name, 
        total, 
        nilaiAkhir: score.toFixed(2), 
        status: statusText, 
        photoURL: s.photoURL,
        kjkValue: kjkTime,
        kjkMins: kjkMins
      };
    });

    const sortedSummary = staffSummary.sort((a, b) => {
      if (Number(b.nilaiAkhir) !== Number(a.nilaiAkhir)) {
        return Number(b.nilaiAkhir) - Number(a.nilaiAkhir);
      }
      return a.kjkMins - b.kjkMins;
    });

    const myReports = periodReports.filter(r => r.userId === user?.username);
    const myTotal = myReports.length; const mySelesai = myReports.filter(r => r.status === 'selesai').length;
    
    // LOGIKA PENCARIAN NAMA DEPAN UNTUK USER PRIBADI
    const myFirstWord = getFirstWord(user?.name);
    const myKJKObj = currentKJK.find(k => getFirstWord(k.nama) === myFirstWord);
    const myKJK = myKJKObj ? myKJKObj.kjkValue : '00:00';

    return { 
      myTotal, 
      myNilaiAkhir: (myTotal > 0 ? (( (myReports.reduce((a,c)=>a+Math.min((c.realisasi/c.target)*100, 100),0)/myTotal) + (myReports.reduce((a,c)=>a+(Number(c.nilaiPimpinan)||0),0)/myTotal) )/2).toFixed(2) : "0.00"), 
      isFinal: (myTotal > 0 && mySelesai === myTotal), 
      myYearly: (yearlyReports.length > 0 ? ( (yearlyReports.reduce((a,c)=>a+Math.min((c.realisasi/c.target)*100, 100),0)/yearlyReports.length) + (yearlyReports.reduce((a,c)=>a+(Number(c.nilaiPimpinan)||0),0)/yearlyReports.length) ) / 2 : 0).toFixed(2), 
      staffSummary: sortedSummary, 
      myStatus: myTotal === 0 ? "Belum Ada Laporan" : (mySelesai === myTotal ? "Selesai" : "Menunggu Penilaian"),
      myKJK
    };
  }, [reports, users, user, selectedMonth, selectedYear, kjkData]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 font-sans"><Loader2 className="animate-spin text-indigo-600" size={50} /></div>;

  if (!user) return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-4 italic">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-12 shadow-2xl text-center font-sans">
        {appSettings.logoURL ? (
            <img src={appSettings.logoURL} alt="Logo" className="h-16 mx-auto mb-6 object-contain" />
        ) : (
            <ShieldCheck size={45} className="text-indigo-600 mx-auto mb-6" />
        )}
        <h1 className="text-4xl font-black mb-1 tracking-tighter text-slate-800 uppercase italic leading-none">PIRU</h1>
        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 leading-none italic">Penilaian Kinerja Bulanan</p>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-10 text-center leading-none italic">BPS Kabupaten Seram Bagian Barat</p>
        <form onSubmit={handleLogin} className="space-y-4 text-left font-sans not-italic">
          <input type="text" placeholder="Username" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none font-bold" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} />
          <div className="relative">
            <input type={showLoginPass ? "text" : "password"} placeholder="Password" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none font-bold pr-14" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
            <button type="button" onClick={() => setShowLoginPass(!showLoginPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">{showLoginPass ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
          </div>
          {authError && <div className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase italic animate-pulse"><AlertCircle size={14}/> {authError}</div>}
          <button className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-xs mt-4 transition-all active:scale-95 shadow-lg">Login</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row font-sans overflow-hidden text-slate-800 italic">
      <div className="hidden md:flex w-72 bg-white border-r p-8 flex-col h-full sticky top-0 not-italic">
        <div className="flex items-center gap-4 mb-14 px-2 italic">
          <div className="p-2 rounded-2xl text-white">
            {appSettings.logoURL ? (
                <img src={appSettings.logoURL} alt="Logo" className="w-12 h-12 object-contain" />
            ) : (
                <div className="bg-indigo-600 p-3 rounded-2xl"><ShieldCheck size={28}/></div>
            )}
          </div>
          <div><h2 className="font-black text-2xl uppercase tracking-tighter leading-none italic">PIRU</h2><p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest mt-1 italic">Penilaian Kinerja Bulanan</p></div>
        </div>
        <nav className="flex-1 space-y-3 font-sans not-italic">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutDashboard size={20}/> Dashboard</button>
          {user.role !== 'admin' && (<button onClick={() => setActiveTab('laporan')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'laporan' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={20}/> Entri Pekerjaan</button>)}
          <button onClick={() => setActiveTab('bukti_dukung')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'bukti_dukung' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Link size={20}/> Bukti Dukung</button>
          {['admin', 'pimpinan', 'ketua'].includes(user.role) && (<button onClick={() => setActiveTab('penilaian')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'penilaian' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><ClipboardCheck size={20}/> Penilaian Anggota</button>)}
          {user.role === 'admin' && (<button onClick={() => setActiveTab('kjk_management')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'kjk_management' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><FileSpreadsheet size={20}/> Manajemen KJK</button>)}
          {user.role === 'admin' && (<button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Users size={20}/> Data Pegawai</button>)}
        </nav>
        <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center gap-4 px-5 py-3 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:text-indigo-600 transition-all italic mb-2"><KeyRound size={16}/> Ganti Password</button>
        <button onClick={() => {localStorage.clear(); window.location.reload();}} className="w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase text-red-500 transition-all italic"><LogOut size={20}/> Logout</button>
      </div>

      <main className="flex-1 flex flex-col h-screen overflow-hidden font-sans italic relative">
        <header className="px-6 md:px-10 py-6 md:py-10 pb-4 flex flex-row justify-between items-center italic sticky top-0 bg-blue-50/80 backdrop-blur-md border-b border-blue-100 z-30 shadow-sm">
          <div className="flex-1 flex items-center gap-4 italic">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-white flex-shrink-0">
                {user.photoURL ? ( <img src={user.photoURL} alt="Profil" className="w-full h-full object-cover" />
                ) : ( <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-black text-lg">{user.name.charAt(0)}</div> )}
            </div>
            <div className="italic">
              <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tighter uppercase leading-none italic break-words">{user.name}</h1>
              <p className="text-indigo-600 font-bold uppercase tracking-widest text-[8px] mt-2 inline-block bg-white px-3 py-1 rounded-full border border-indigo-100 italic">{user.jabatan || user.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 md:gap-3 not-italic">
             <button onClick={exportToExcel} className="md:hidden p-2 text-green-600 bg-white rounded-xl shadow-sm border border-slate-100"><Download size={22}/></button>
             <button onClick={() => setShowPasswordModal(true)} className="md:hidden p-2 text-indigo-600 bg-white rounded-xl shadow-sm border border-slate-100"><KeyRound size={22}/></button>
             <button onClick={() => {localStorage.clear(); window.location.reload();}} className="md:hidden p-2 text-red-500 bg-white rounded-xl shadow-sm border border-slate-100"><LogOut size={22}/></button>
             <div className="hidden md:flex items-center gap-3">
               {(activeTab === 'penilaian' || activeTab === 'bukti_dukung' || activeTab === 'kjk_management') && ['admin', 'pimpinan', 'ketua'].includes(user.role) && (
                  <>
                    <select className="p-2 bg-white border border-slate-200 rounded-xl font-black text-[10px] text-slate-600 shadow-sm outline-none italic" value={filterStaffName} onChange={e => setFilterStaffName(e.target.value)}>
                      <option value="Semua">Data Saya</option>
                      {users.filter(u => !['admin', 'pimpinan'].includes(u.role)).map(u => <option key={u.firestoreId} value={u.name}>{u.name}</option>)}
                    </select>
                    {activeTab === 'penilaian' && filterStaffName !== 'Semua' && ( <button onClick={handleNilaiSemua} className="bg-amber-500 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 shadow-md italic"><CheckCircle2 size={14}/> Nilai Semua</button> )}
                  </>
                )}
               <select className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-black text-[10px] text-slate-600 outline-none shadow-sm cursor-pointer italic" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                 {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
               </select>
               <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 shadow-md italic"><Download size={14}/> Cetak</button>
               {user.role !== 'admin' && <button onClick={() => { resetReportForm(); setShowReportModal(true); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] shadow-lg flex items-center gap-2 italic"><Plus size={14}/> Entri</button>}
             </div>
          </div>
        </header>

        <div className="md:hidden px-6 py-4 bg-white border-b flex items-center justify-center gap-4 z-20">
            <span className="text-[10px] font-black uppercase text-slate-400 italic">Periode:</span>
            <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-black text-[12px] text-indigo-600 outline-none shadow-sm cursor-pointer italic" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <span className="font-black text-[12px] italic text-slate-400">{selectedYear}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-10 pt-8 custom-scrollbar mb-24 md:mb-0">
          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in duration-500 italic">
              {['admin', 'pimpinan'].includes(user.role) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
                  {dashboardStats.staffSummary.map((s, i) => (
                    <div key={i} className="bg-slate-900 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-800 shadow-xl italic flex flex-col items-center text-center group transition-all hover:border-indigo-500/50">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2rem] overflow-hidden mb-6 border-4 border-slate-800 shadow-lg bg-slate-800 flex-shrink-0">
                        {s.photoURL ? ( <img src={s.photoURL} alt={s.name} className="w-full h-full object-cover" />
                        ) : ( <div className="w-full h-full flex items-center justify-center bg-indigo-500/10 text-indigo-400"><User size={40} /></div> )}
                      </div>
                      <p className="font-black text-xl text-white uppercase italic mb-1 tracking-tighter text-center">{s.name}</p>
                      <span className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-full mb-6 ${s.status === 'Selesai' ? 'bg-green-900/40 text-green-400' : 'bg-amber-900/40 text-amber-400'}`}>{s.status}</span>
                      
                      <div className="w-full grid grid-cols-2 gap-4 border-t border-slate-800 pt-6 mt-auto">
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-500 uppercase italic mb-1">CKP Akhir</p>
                            <p className="text-3xl font-black text-white italic">{s.nilaiAkhir}</p>
                        </div>
                        <div className="text-center border-l border-slate-800">
                            <p className="text-[9px] font-black text-slate-500 uppercase italic mb-1">Disiplin KJK</p>
                            <p className={`text-[11px] font-black italic mt-2 uppercase ${s.kjkMins === 0 ? 'text-amber-400' : 'text-red-400'}`}>
                                {s.kjkMins === 0 ? "Sempurna 🌟" : formatKJKDisplay(s.kjkValue)}
                            </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 italic mb-10">
                  <div className="bg-slate-900 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl border border-slate-800 flex flex-col items-center text-center">
                    <div className="bg-amber-500/10 p-5 rounded-3xl mb-8"><TrendingUp size={32} className="text-amber-500"/></div>
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-2 tracking-[0.2em] italic text-center">{dashboardStats.isFinal ? "Nilai Akhir" : "Estimasi Nilai"}</p>
                    <p className="text-6xl md:text-7xl font-black text-amber-500 tracking-tighter italic mb-8 text-center">{dashboardStats.myNilaiAkhir}</p>
                    <div className="w-full border-t border-slate-800 pt-8 mt-auto flex flex-col items-center italic text-center text-slate-500">
                       <p className="text-[9px] font-black uppercase italic tracking-widest">{dashboardStats.myStatus}</p>
                    </div>
                  </div>
                  <div className="bg-slate-900 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl border border-slate-800 flex flex-col items-center text-center">
                    <div className="bg-indigo-500/10 p-5 rounded-3xl mb-8"><Clock size={32} className="text-indigo-400"/></div>
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-2 tracking-[0.2em] italic text-center">Kedisiplinan (KJK)</p>
                    <p className={`text-4xl font-black tracking-tighter italic mb-4 text-center uppercase ${timeToMinutes(dashboardStats.myKJK) === 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatKJKDisplay(dashboardStats.myKJK)}
                    </p>
                    <div className="w-full border-t border-slate-800 pt-8 mt-auto italic text-center">
                       <p className="text-[10px] font-black text-amber-400 uppercase italic tracking-tighter leading-tight">
                         {timeToMinutes(dashboardStats.myKJK) === 0 ? getMotivation(user.name) : "Ayo tingkatkan kedisiplinan anda!"}
                       </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'kjk_management' && user.role === 'admin' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500 italic mb-10">
                <div className="bg-white rounded-[2.5rem] shadow-sm border p-8 md:p-12 mb-8 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-8 italic">
                        <div className="w-24 h-24 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                            <FileSpreadsheet size={40} />
                        </div>
                        <div className="flex-1 italic">
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2 italic">Upload Data KJK Bulanan</h2>
                            <p className="text-[11px] text-slate-400 font-bold uppercase italic mb-6">Import data Kekurangan Jam Kerja pegawai dari Excel (Format: No | Nama | KJK hh:mm)</p>
                            <label className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] cursor-pointer inline-flex items-center gap-3 transition-all active:scale-95 shadow-lg italic">
                                <Plus size={16}/> Pilih File Excel
                                <input type="file" accept=".xlsx, .xls" onChange={handleUploadKJK} className="hidden" />
                            </label>
                        </div>
                    </div>
                </div>
                <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border overflow-hidden p-0 italic">
                    <table className="w-full text-left italic text-xs border-collapse">
                        <thead className="bg-slate-100 border-b text-[9px] font-black text-slate-500 uppercase tracking-widest italic sticky top-0 z-20">
                            <tr>
                                <th className="p-4 w-12 text-center">No</th>
                                <th className="p-4">Nama Pegawai</th>
                                <th className="p-4 text-center">Bulan/Tahun</th>
                                <th className="p-4 text-center">Total KJK</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 italic">
                            {kjkData.filter(k => k.month === selectedMonth && k.year === selectedYear).length === 0 ? (
                                <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-bold uppercase text-[10px] italic">Belum ada data KJK terupload periode ini</td></tr>
                            ) : (
                                kjkData.filter(k => k.month === selectedMonth && k.year === selectedYear).map((k, idx) => (
                                    <tr key={k.id} className="hover:bg-slate-50 italic">
                                        <td className="p-4 font-bold text-slate-400 text-center">{idx + 1}</td>
                                        <td className="p-4 font-black text-slate-800 uppercase italic">{k.nama}</td>
                                        <td className="p-4 text-center font-bold text-slate-500 uppercase italic">{selectedMonth} / {selectedYear}</td>
                                        <td className="p-4 text-center">
                                            <span className={`font-black uppercase text-[10px] px-3 py-1 rounded-full ${timeToMinutes(k.kjkValue) === 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                {formatKJKDisplay(k.kjkValue)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center italic">
                                            <button onClick={() => deleteDoc(doc(db, "kjk", k.id))} className="text-red-400 hover:text-red-600 transition-all"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="md:hidden space-y-4">
                    {kjkData.filter(k => k.month === selectedMonth && k.year === selectedYear).map((k, idx) => (
                        <div key={k.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex justify-between items-center italic">
                            <div className="italic">
                                <p className="text-[10px] font-black text-indigo-600 uppercase italic mb-1">#{idx+1} - {selectedMonth}/{selectedYear}</p>
                                <h3 className="font-black text-slate-800 uppercase text-xs italic">{k.nama}</h3>
                                <p className={`text-[10px] font-black uppercase mt-2 italic ${timeToMinutes(k.kjkValue) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    KJK: {formatKJKDisplay(k.kjkValue)}
                                </p>
                            </div>
                            <button onClick={() => deleteDoc(doc(db, "kjk", k.id))} className="p-4 bg-red-50 text-red-400 rounded-2xl"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {activeTab === 'bukti_dukung' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500 italic mb-10">
               {['admin', 'pimpinan', 'ketua'].includes(user.role) && (
                  <div className="md:hidden flex flex-col gap-3 mb-6 not-italic">
                    <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-black text-[12px] text-slate-600 shadow-sm italic outline-none" value={filterStaffName} onChange={e => setFilterStaffName(e.target.value)}>
                      <option value="Semua">Data Saya</option>
                      {users.filter(u => !['admin', 'pimpinan'].includes(u.role)).map(u => <option key={u.firestoreId} value={u.name}>{u.name}</option>)}
                    </select>
                  </div>
               )}
               <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border overflow-hidden p-0 italic">
                  <table className="w-full text-left italic text-xs border-collapse">
                    <thead className="bg-slate-100 border-b text-[9px] font-black text-slate-500 uppercase tracking-widest italic sticky top-0 z-20">
                      <tr>
                        <th className="p-4 w-12 text-center">No</th>
                        <th className="p-4">Uraian Pekerjaan</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center">Link Bukti Dukung (Google Drive)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 italic">
                      {currentFilteredReports.length === 0 ? (
                        <tr><td colSpan="4" className="p-10 text-center text-slate-400 font-bold uppercase text-[10px] italic">Tidak ada data untuk periode ini</td></tr>
                      ) : (
                        currentFilteredReports.map((r, idx) => (
                          <tr key={r.id} className="hover:bg-slate-50 transition-all italic group">
                            <td className="p-4 font-bold text-slate-400 text-center">{idx + 1}</td>
                            <td className="p-4"><p className="font-black text-[12px] text-slate-800 uppercase tracking-tight leading-none mb-1 italic">{r.title}</p><span className="text-indigo-600 text-[8px] font-black uppercase bg-indigo-50 px-2 py-0.5 rounded-lg italic">{r.userName}</span></td>
                            <td className="p-4 text-center">
                               <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md ${r.status === 'selesai' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{r.status.replace('_', ' ')}</span>
                            </td>
                            <td className="p-4">
                               <div className="flex flex-col md:flex-row items-center gap-2 italic">
                                  {r.userId === user.username ? (
                                    <div className="flex items-center gap-2 w-full max-w-md">
                                       <input 
                                         type="url" 
                                         placeholder="Paste Link Drive..." 
                                         className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-[10px] italic"
                                         value={tempLinks[r.id] || r.linkDrive || ''}
                                         onChange={(e) => setTempLinks({...tempLinks, [r.id]: e.target.value})}
                                       />
                                       <button onClick={() => handleUpdateLinkDrive(r.id)} className="p-3 bg-indigo-600 text-white rounded-xl shadow-md active:scale-95 transition-all"><CheckCircle2 size={16}/></button>
                                    </div>
                                  ) : null}
                                  {r.linkDrive && (
                                     <div className="flex items-center gap-2">
                                        <a href={r.linkDrive} target="_blank" rel="noopener noreferrer" className="p-3 bg-green-50 text-green-600 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase shadow-sm"><ExternalLink size={14}/> Buka</a>
                                        <button onClick={() => {navigator.clipboard.writeText(r.linkDrive); alert("Link berhasil disalin!");}} className="p-3 bg-slate-100 text-slate-600 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase shadow-sm"><Copy size={14}/> Salin</button>
                                     </div>
                                  )}
                               </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
               </div>
               <div className="md:hidden space-y-4">
                  {currentFilteredReports.length === 0 ? (
                    <div className="bg-white p-10 rounded-[2.5rem] border border-dashed border-slate-200 text-center italic">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Tidak ada data lapor</p>
                    </div>
                  ) : (
                    currentFilteredReports.map((r, idx) => (
                      <div key={r.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 italic">
                         <div className="flex justify-between items-center mb-4 italic">
                            <span className="text-[10px] font-black text-indigo-600 uppercase italic">No. {idx + 1}</span>
                            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md ${r.status === 'selesai' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{r.status.replace('_', ' ')}</span>
                         </div>
                         <h3 className="font-black text-slate-800 uppercase text-xs leading-tight mb-2 italic">{r.title}</h3>
                         <p className="text-[9px] text-indigo-600 font-bold mb-6 italic uppercase">Oleh: {r.userName}</p>
                         <div className="space-y-4 pt-4 border-t italic">
                            {r.userId === user.username && (
                               <div className="flex items-center gap-2 italic">
                                  <input 
                                    type="url" 
                                    placeholder="Paste Link Drive..." 
                                    className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-[10px] italic"
                                    value={tempLinks[r.id] || r.linkDrive || ''}
                                    onChange={(e) => setTempLinks({...tempLinks, [r.id]: e.target.value})}
                                  />
                                  <button onClick={() => handleUpdateLinkDrive(r.id)} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all"><CheckCircle2 size={18}/></button>
                               </div>
                            )}
                            {r.linkDrive && (
                               <div className="grid grid-cols-2 gap-3 italic">
                                  <a href={r.linkDrive} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 p-4 bg-green-50 text-green-600 rounded-2xl font-black text-[10px] uppercase shadow-sm italic"><ExternalLink size={16}/> Buka</a>
                                  <button onClick={() => {navigator.clipboard.writeText(r.linkDrive); alert("Link berhasil disalin!");}} className="flex items-center justify-center gap-2 p-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase shadow-sm italic"><Copy size={16}/> Salin</button>
                               </div>
                            )}
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="italic mb-10">
              <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden p-6 italic mb-6">
                <table className="w-full text-left text-xs italic">
                  <thead><tr className="bg-slate-50 border-b text-[9px] font-black text-slate-400 uppercase italic"><th className="p-4">Pegawai</th><th className="p-4 text-center">Aksi</th></tr></thead>
                  <tbody>{users.map(u => (<tr key={u.firestoreId} className="border-b hover:bg-slate-50 italic"><td className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                      {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">{u.name.charAt(0)}</div>}
                    </div>
                    <div><p className="font-black text-slate-800 uppercase tracking-tighter leading-none">{u.name}</p><p className="text-indigo-500 text-[8px] font-bold mt-1">@{u.username} | {u.role}</p></div>
                  </td><td className="p-4 text-center"><div className="flex justify-center gap-2"><button onClick={() => { setIsEditingUser(true); setCurrentUserId(u.firestoreId); setNewUser({ name: u.name, username: u.username, password: u.password, role: u.role, jabatan: u.jabatan, photoURL: u.photoURL || '' }); setShowUserModal(true); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl italic"><Edit3 size={14}/></button><button onClick={() => deleteDoc(doc(db, "users", u.firestoreId))} className="p-2 bg-red-50 text-red-400 rounded-xl italic"><Trash2 size={14}/></button></div></td></tr>))}</tbody>
                </table>
                <button onClick={() => { resetUserForm(); setShowUserModal(true); }} className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 italic"><UserPlus size={14}/> Tambah Pegawai</button>
              </div>
              {user.role === 'admin' && (
                <div className="bg-white rounded-[2.5rem] shadow-sm border p-8 flex flex-col md:flex-row items-center gap-8 italic">
                   <div className="w-32 h-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
                      {appSettings.logoURL ? ( <img src={appSettings.logoURL} className="w-full h-full object-contain p-2" /> ) : ( <ImageIcon size={32} className="text-slate-300" /> )}
                      <input type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                   </div>
                   <div className="flex-1 text-center md:text-left italic">
                      <h4 className="font-black text-slate-800 uppercase tracking-tighter mb-1 italic">Logo Aplikasi Global</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase italic mb-4">Ganti logo pada halaman Login dan Sidebar untuk semua user</p>
                      <label className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] cursor-pointer inline-block transition-all active:scale-95 italic">Pilih Logo Baru</label>
                   </div>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'laporan' || activeTab === 'penilaian') && (
            <div className="italic">
              <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border p-0 overflow-hidden italic mb-10">
                <table className="w-full text-left italic text-xs border-collapse">
                  <thead className="bg-slate-100 border-b text-[9px] font-black text-slate-500 uppercase tracking-widest italic sticky top-0 z-20">
                    <tr><th className="p-4 w-12 text-center italic">No</th><th className="p-4 italic">Uraian Pekerjaan</th><th className="p-4 w-24 text-center italic">Satuan</th><th className="p-4 text-center w-28 italic">Volume</th><th className="p-4 text-center w-16 italic">Cap%</th><th className="p-4 text-center w-16 italic text-amber-600">Ketua</th><th className="p-4 text-center w-16 italic text-indigo-600">Pimp</th><th className="p-4 text-center w-24 italic">Aksi</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 italic">
                    {currentFilteredReports.map((r, idx) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-all italic group">
                        <td className="p-4 font-bold text-slate-400 text-center">{idx + 1}</td>
                        <td className="p-4 italic"><p className="font-black text-[12px] text-slate-800 uppercase tracking-tight leading-none mb-1 italic">{r.title}</p><span className="text-indigo-600 text-[8px] font-black uppercase bg-indigo-50 px-2 py-0.5 rounded-lg italic">{r.userName}</span></td>
                        <td className="p-4 text-center font-bold text-slate-500 uppercase text-[10px] italic">{r.satuan || '-'}</td>
                        <td className="p-4 text-center font-black italic">{r.realisasi} / {r.target}</td>
                        <td className="p-4 text-center font-black text-indigo-600 italic text-center">{((r.realisasi/r.target)*100).toFixed(0)}%</td>
                        <td className="p-4 text-center font-black text-slate-300 text-lg italic"><div className="relative group inline-block">{r.nilaiKetua || '-'}{user.role === 'admin' && activeTab === 'penilaian' && r.nilaiKetua > 0 && (<button onClick={() => clearGrade(r.id, 'nilaiKetua')} className="absolute -top-1 -right-3 text-red-400 opacity-0 group-hover:opacity-100 italic"><Trash2 size={10}/></button>)}</div></td>
                        <td className="p-4 text-center font-black text-indigo-600 text-lg italic"><div className="relative group inline-block">{r.nilaiPimpinan || '-'}{user.role === 'admin' && activeTab === 'penilaian' && r.nilaiPimpinan > 0 && (<button onClick={() => clearGrade(r.id, 'nilaiPimpinan')} className="absolute -top-1 -right-3 text-red-400 opacity-0 group-hover:opacity-100 italic"><Trash2 size={10}/></button>)}</div></td>
                        <td className="p-4 text-center italic"><div className="flex justify-center gap-1 italic">{activeTab === 'laporan' && r.status === 'pending' && <><button onClick={() => { setIsEditing(true); setCurrentReportId(r.id); setNewReport({title: r.title, target: r.target, realisasi: r.realisasi, satuan: r.satuan, keterangan: r.keterangan || ''}); setShowReportModal(true); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl italic"><Edit3 size={14}/></button><button onClick={() => deleteDoc(doc(db, "reports", r.id))} className="p-2 bg-red-50 text-red-400 rounded-xl italic"><Trash2 size={14}/></button></>}{activeTab === 'penilaian' && (<>{['ketua', 'admin'].includes(user.role) && <button onClick={() => submitGrade(r.id, 'ketua')} className="bg-amber-400 text-white px-3 py-1.5 rounded-xl text-[8px] font-black uppercase italic shadow-sm">Ketua</button>}{['pimpinan', 'admin'].includes(user.role) && <button onClick={() => submitGrade(r.id, 'pimpinan')} className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[8px] font-black uppercase italic shadow-sm">Pimp</button>}</>)}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-4 pb-12">
                {activeTab === 'penilaian' && (
                  <div className="flex flex-col gap-3 mb-4 not-italic">
                    <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] text-slate-600 shadow-sm italic outline-none" value={filterStaffName} onChange={e => setFilterStaffName(e.target.value)}>
                      <option value="Semua">Semua Pegawai</option>
                      {users.filter(u => !['admin', 'pimpinan'].includes(u.role)).map(u => <option key={u.firestoreId} value={u.name}>{u.name}</option>)}
                    </select>
                    {filterStaffName !== 'Semua' && ( <button onClick={handleNilaiSemua} className="w-full bg-amber-500 text-white p-4 rounded-2xl font-black uppercase text-[10px] shadow-md italic">Nilai Semua {filterStaffName}</button> )}
                  </div>
                )}
                {currentFilteredReports.length === 0 ? (
                  <div className="bg-white p-10 rounded-[2.5rem] border border-dashed border-slate-200 text-center italic">
                    <AlertCircle className="mx-auto text-slate-300 mb-2" size={32} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada data laporan</p>
                  </div>
                ) : (
                  currentFilteredReports.map((r, idx) => (
                    <div key={r.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 italic">
                      <div className="flex justify-between items-start mb-2 italic">
                        <span className="text-[10px] font-black text-indigo-600 uppercase italic">#{idx + 1} - {r.satuan}</span>
                        <div className="flex gap-2">
                          {activeTab === 'laporan' && r.status === 'pending' && (
                            <>
                              <button onClick={() => { setIsEditing(true); setCurrentReportId(r.id); setNewReport({title: r.title, target: r.target, realisasi: r.realisasi, satuan: r.satuan, keterangan: r.keterangan || ''}); setShowReportModal(true); }} className="text-indigo-400"><Edit3 size={18}/></button>
                              <button onClick={() => deleteDoc(doc(db, "reports", r.id))} className="text-red-400"><Trash2 size={18}/></button>
                            </>
                          )}
                        </div>
                      </div>
                      <h3 className="font-black text-slate-800 uppercase text-xs leading-tight mb-2 italic">{r.title}</h3>
                      <p className="text-[9px] text-indigo-600 font-bold mb-4 italic uppercase">Oleh: {r.userName}</p>
                      <div className="grid grid-cols-2 gap-4 border-t pt-4 italic">
                        <div className="text-center"><p className="text-[8px] text-slate-400 uppercase font-black italic">Target/Real</p><p className="font-black text-[10px] italic">{r.realisasi} / {r.target}</p></div>
                        <div className="text-center"><p className="text-[8px] text-slate-400 uppercase font-black italic">Ketua/Pimp</p><p className="font-black text-[10px] italic text-indigo-600">{r.nilaiKetua} / {r.nilaiPimpinan}</p></div>
                      </div>
                      {activeTab === 'penilaian' && (
                        <div className="flex gap-2 mt-4 italic">
                          {['ketua', 'admin'].includes(user.role) && <button onClick={() => submitGrade(r.id, 'ketua')} className="flex-1 py-3 bg-amber-400 text-white rounded-xl text-[9px] font-black uppercase shadow-sm italic">Nilai Ketua</button>}
                          {['pimpinan', 'admin'].includes(user.role) && <button onClick={() => submitGrade(r.id, 'pimpinan')} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase shadow-sm italic">Nilai Pimp</button>}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        {user.role !== 'admin' && activeTab === 'laporan' && ( <button onClick={() => { resetReportForm(); setShowReportModal(true); }} className="md:hidden fixed bottom-28 right-6 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50 active:scale-95 transition-all"> <Plus size={32}/> </button> )}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 pb-6 flex justify-around items-center z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] not-italic">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-300'}`}><LayoutDashboard size={24}/><span className="text-[8px] font-black uppercase">Home</span></button>
          {user.role !== 'admin' && (<button onClick={() => setActiveTab('laporan')} className={`flex flex-col items-center gap-1 ${activeTab === 'laporan' ? 'text-indigo-600' : 'text-slate-300'}`}><FileText size={24}/><span className="text-[8px] font-black uppercase">Entri</span></button>)}
          <button onClick={() => setActiveTab('bukti_dukung')} className={`flex flex-col items-center gap-1 ${activeTab === 'bukti_dukung' ? 'text-indigo-600' : 'text-slate-300'}`}><Link size={24}/><span className="text-[8px] font-black uppercase">Bukti</span></button>
          {['admin', 'pimpinan', 'ketua'].includes(user.role) && (<button onClick={() => setActiveTab('penilaian')} className={`flex flex-col items-center gap-1 ${activeTab === 'penilaian' ? 'text-indigo-600' : 'text-slate-300'}`}><ClipboardCheck size={24}/><span className="text-[8px] font-black uppercase">Nilai</span></button>)}
          {user.role === 'admin' && (<button onClick={() => setActiveTab('users')} className={`flex flex-col items-center gap-1 ${activeTab === 'users' ? 'text-indigo-600' : 'text-slate-300'}`}><Users size={24}/><span className="text-[8px] font-black uppercase">Pegawai</span></button>)}
        </div>
      </main>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-[100] font-sans italic">
          <form onSubmit={handleUpdatePassword} className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative italic">
            <button type="button" onClick={() => setShowPasswordModal(false)} className="absolute top-6 right-6 p-3 bg-slate-50 rounded-full text-slate-400 italic"><X size={20}/></button>
            <KeyRound size={40} className="text-indigo-600 mb-6" />
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 text-slate-800 italic text-center">Ganti Password</h3>
            <div className="space-y-4 italic mt-8">
               <div className="relative">
                 <input required type={showCurrentPass ? "text" : "password"} placeholder="Password Saat Ini" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-800 border border-slate-100 pr-14 italic text-center" value={newPasswordData.current} onChange={e => setNewPasswordData({...newPasswordData, current: e.target.value})} />
                 <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">{showCurrentPass ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
               </div>
               <div className="relative">
                 <input required type={showNewPass ? "text" : "password"} placeholder="Password Baru" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-800 border border-slate-100 pr-14 italic text-center" value={newPasswordData.new} onChange={e => setNewPasswordData({...newPasswordData, new: e.target.value})} />
                 <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">{showNewPass ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
               </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-6 rounded-2xl shadow-xl uppercase tracking-widest text-[10px] mt-8 italic transition-all active:scale-95 text-center">Update Password</button>
          </form>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-[100] font-sans italic">
          <form onSubmit={handleAddOrEditUser} className="bg-white w-full max-w-xl rounded-[3rem] p-12 shadow-2xl relative italic">
            <button type="button" onClick={() => { setShowUserModal(false); resetUserForm(); }} className="absolute top-8 right-8 p-4 bg-slate-50 rounded-full text-slate-400 italic"><X size={20}/></button>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 text-slate-800 italic text-center">{isEditingUser ? "Edit Akun Pegawai" : "Tambah Pegawai"}</h3>
            <div className="space-y-4 italic">
                <div className="flex flex-col items-center mb-6">
                   <div className="w-24 h-24 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center relative group">
                      {newUser.photoURL ? ( <img src={newUser.photoURL} className="w-full h-full object-cover" /> ) : ( <Camera size={28} className="text-slate-300" /> )}
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                   </div>
                   <p className="text-[9px] font-black text-indigo-600 uppercase mt-2 italic text-center">Klik untuk Upload Foto</p>
                </div>
                <input required type="text" placeholder="Nama Lengkap" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 border border-slate-100 italic text-center" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4 italic text-center">
                    <input required type="text" placeholder="Username" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 border border-slate-100 italic text-center" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                    <div className="relative">
                      <input required type={showAdminPass ? "text" : "password"} placeholder="Password" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 border border-slate-100 pr-14 italic text-center" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                      <button type="button" onClick={() => setShowAdminPass(!showAdminPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">{showAdminPass ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                    </div>
                </div>
                <input type="text" placeholder="Jabatan" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 border border-slate-100 italic text-center" value={newUser.jabatan} onChange={e => setNewUser({...newUser, jabatan: e.target.value})} />
                <select className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-600 border border-slate-100 italic" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                    <option value="pegawai">Pegawai</option><option value="ketua">Ketua Tim</option><option value="pimpinan">Pimpinan</option><option value="admin">Admin</option>
                </select>
                <button type="submit" className="w-full bg-indigo-600 text-white font-black py-6 rounded-2xl shadow-xl uppercase tracking-widest text-[10px] mt-6 italic transition-all active:scale-95 text-center">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-[100] font-sans italic text-center">
          <form onSubmit={handleSubmitReport} className="bg-white w-full max-w-2xl rounded-[3rem] p-8 md:p-12 shadow-2xl relative italic max-h-[90vh] overflow-y-auto">
            <button type="button" onClick={() => { resetReportForm(); setShowReportModal(false); }} className="absolute top-6 right-6 p-3 bg-slate-50 rounded-full text-slate-400 italic"><X size={20}/></button>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 text-slate-800 italic text-center">{isEditing ? "Update Pekerjaan" : (activeTab === 'penilaian' ? "Entri Anggota" : "Entri Pekerjaan Saya")}</h3>
            <div className="space-y-4 italic text-center">
               {activeTab === 'penilaian' && !isEditing && ( <select required className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-indigo-600 border border-slate-100 italic" value={newReport.targetUser} onChange={e => setNewReport({...newReport, targetUser: e.target.value})}> <option value="">-- Pilih Nama Pegawai --</option> {users.filter(u => !['admin', 'pimpinan'].includes(u.role)).map(u => <option key={u.firestoreId} value={u.name}>{u.name}</option>)} </select> )}
               <input required type="text" placeholder="Uraian Pekerjaan" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-800 border border-slate-100 italic text-center" value={newReport.title} onChange={e => setNewReport({...newReport, title: e.target.value})} />
               <div className="grid grid-cols-2 gap-4 italic text-center"> <input required type="number" placeholder="Target" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-800 border border-slate-100 italic text-center" value={newReport.target} onChange={e => setNewReport({...newReport, target: e.target.value})} /> <input required type="number" placeholder="Realisasi" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-800 border border-slate-100 italic text-center" value={newReport.realisasi} onChange={e => setNewReport({...newReport, realisasi: e.target.value})} /> </div>
               <input list="satuan-list" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-800 border border-slate-100 italic text-center" placeholder="Satuan" value={newReport.satuan} onChange={e => setNewReport({...newReport, satuan: e.target.value})} />
               <datalist id="satuan-list"><option value="Dokumen"/><option value="Kegiatan"/><option value="Laporan"/><option value="Paket"/></datalist>
               <textarea className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold h-24 resize-none text-slate-600 border border-slate-100 italic text-center" placeholder="Keterangan..." value={newReport.keterangan} onChange={e => setNewReport({...newReport, keterangan: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-6 rounded-2xl shadow-xl uppercase tracking-widest text-xs mt-8 italic transition-all active:scale-95 text-center">Simpan Data</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PIRUApp;
