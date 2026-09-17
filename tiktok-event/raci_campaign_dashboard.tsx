import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, CheckCircle2, Clock, AlertCircle, User, Users, 
  Search, Download, Plus, Trash2, Check, Edit2, FileSpreadsheet, 
  Coffee, Briefcase, ArrowRight, ArrowUp, ArrowDown, Settings, X, RefreshCw, 
  Lock, Unlock, KeyRound, UserMinus, MessageSquare, Layers, Sparkles, Shield, ChevronRight
} from 'lucide-react';

// Import Firebase Modules untuk integrasi Cloud Database
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot } from 'firebase/firestore';

// ==========================================
// 1. FIREBASE INITIALIZATION & AUTH CONFIG
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Pembuat standard template RACI (Berdasarkan data operasi Himcoffee)
const getStandardRaciTemplate = () => [
  { id: 1, phase: "PRE-CAMPAIGN", item: "Setup a Target KPI & Budget", dueDate: "-", r: "Hafizie", a: "Dr Samhan", status: "Pending", note: "" },
  { id: 2, phase: "PRE-CAMPAIGN", item: "Brainstorm Gameplay Content and Live", dueDate: "-", r: "Rafhanah\nShahirah", a: "Hafizie", status: "Pending", note: "" },
  { id: 3, phase: "PRE-CAMPAIGN", item: "Draft 20 Konten Seeding Dr Samhan", dueDate: "-", r: "Rafhanah", a: "Hafizie", status: "Pending", note: "" },
  { id: 4, phase: "PRE-CAMPAIGN", item: "Shooting Dr Samhan", dueDate: "-", r: "Rafhanah", a: "Dr Samhan", status: "Pending", note: "" },
  { id: 5, phase: "PRE-CAMPAIGN", item: "Create Special Package", dueDate: "-", r: "Hafizie", a: "Dr Samhan", status: "Pending", note: "" },
  { id: 6, phase: "PRE-CAMPAIGN", item: "Posting 20 Content Seeding (1 July to 4 July)", dueDate: "-", r: "Rafhanah", a: "Dr Samhan", status: "Pending", note: "" },
  { id: 7, phase: "PRE-CAMPAIGN", item: "Draft Poster Theme for Catalog", dueDate: "-", r: "Ikram\nZaim", a: "Hafizie", status: "Pending", note: "" },
  { id: 8, phase: "PRE-CAMPAIGN", item: "Upload Catalog Poster di Tiktok dan Shopee 3 Julai - 4 pm", dueDate: "-", r: "Ikram\nZaim", a: "Hafizie", status: "Pending", note: "" },
  { id: 9, phase: "LAUNCH (HARI EVENT)", item: "On iklan berbayar (TikTok/FB Ads)", dueDate: "-", r: "Ikram\nZaim", a: "Hafizie", status: "Pending", note: "" },
  { id: 10, phase: "LAUNCH (HARI EVENT)", item: "Live streaming 6 jam + susunan jadual OT host", dueDate: "-", r: "Live Team", a: "ENA", status: "Pending", note: "" },
  { id: 11, phase: "POST-CAMPAIGN", item: "Pengumpulan data jualan, kos ads & ROI", dueDate: "-", r: "Hafizie", a: "Dr Samhan", status: "Pending", note: "" },
  { id: 12, phase: "POST-CAMPAIGN", item: "Sesi Post Mortem & Minit Meeting", dueDate: "-", r: "Semua Team", a: "Hafizie\nCOO", status: "Pending", note: "" }
];

// Struktur asas Blueprint Strategi 5T & 3M
const defaultStrategyBlueprint = {
  target: "RM 100,000 Sales / 5,000 Units Sold",
  tempoh: "5 Hari (Hari Gaji & Hujung Bulan)",
  timeline: "Fasa Pre-Seeding (3 Hari) | Fasa Launching (1 Hari) | Fasa Post-Mortem (1 Hari)",
  team: "Creative, Ads Specialist, Sales Closing, Live Stream Host",
  tracking: "Google Sheet KPI & Dashboard TikTok/FB Ads Manager",
  market: "Lelaki berumur 25-45 tahun (Coffee Lovers & Coffee Addicts)",
  medium: "FB Ads, TikTok Ads, Email Newsletter & Broadcast WhatsApp",
  message: "Himcoffee: Rasa kopi premium peneman bertenaga sepanjang hari bekerja."
};

// Data master kempen lalai untuk suntikan awal (Tahun 2026)
const rawDefaultCampaignData = {
  Januari: [
    { id: "jan-1", title: "Double Digit (Penutup Disember - Januari)", date: "Fasa penutup Disember", type: "Double Digit" },
    { id: "jan-2", title: "Israk dan Mikraj", date: "17 Januari 2026", type: "Seasonal / Micro-Event" },
    { id: "jan-3", title: "Payday & Month End", date: "24-31 Januari 2026", type: "Payday & Month End" }
  ],
  Februari: [
    { id: "feb-1", title: "Double Digit 2.2", date: "2 Februari 2026", type: "Double Digit" },
    { id: "feb-2", title: "Chinese New Year", date: "17 Februari 2026", type: "Seasonal / Mega Perayaan" },
    { id: "feb-3", title: "Payday & Month End", date: "24-28 Februari 2026", type: "Payday & Month End" }
  ],
  Mac: [
    { id: "mac-1", title: "Double Digit 1.3 - 3.3", date: "1-3 Mac 2026", type: "Double Digit" },
    { id: "mac-2", title: "Women's Day", date: "8 Mac 2026", type: "Seasonal / Micro-Event" },
    { id: "mac-3", title: "Payday & Month End", date: "24-31 Mac 2026", type: "Payday & Month End" }
  ],
  April: [
    { id: "apr-1", title: "Double Digit 1.4 - 4.4", date: "1-4 April 2026", type: "Double Digit" },
    { id: "apr-2", title: "Anniversary Himcoffee", date: "16 April 2026", type: "Seasonal / Brand Event" },
    { id: "apr-3", title: "Payday & Month End", date: "24-30 April 2026", type: "Payday & Month End" }
  ],
  Mei: [
    { id: "mei-1", title: "Double Digit 1.5 - 5.5", date: "1-5 Mei 2026", type: "Double Digit" },
    { id: "mei-2", title: "Mother's Day", date: "10 Mei 2026", type: "Seasonal / Micro-Event" },
    { id: "mei-3", title: "Raya Haji", date: "21 Mei 2026", type: "Seasonal / Mega Perayaan" },
    { id: "mei-4", title: "Payday & Month End", date: "24-31 Mei 2026", type: "Payday & Month End" }
  ],
  Jun: [
    { id: "jun-1", title: "Double Digit", date: "4 June - 7 June", type: "Double Digit" },
    { id: "jun-2", title: "Birthday Dr Samhan", date: "2-6 Jun 2026", type: "Seasonal / Personal Branding" },
    { id: "jun-3", title: "Awal Muharram & Father's Day", date: "17 & 21 Jun 2026", type: "Seasonal / Micro-Event" },
    { id: "jun-4", title: "Payday & Month End", date: "24-30 Jun 2026", type: "Payday & Month End" }
  ],
  Julai: [
    { id: "jul-1", title: "Creators Carnival", date: "16 Julai", type: "Seasonal / Brand Event" },
    { id: "jul-2", title: "Payday Julai", date: "24 Julai - 27 Julai", type: "Payday & Month End" },
    { id: "jul-3", title: "Month End", date: "28 Julai - 31 Julai", type: "Payday & Month End" },
    { id: "jul-4", title: "Double Digit 7.7", date: "7 Julai", type: "Double Digit" },
    { id: "jul-5", title: "Maal Hijrah", date: "17 Julai", type: "Seasonal / Micro-Event" }
  ],
  Ogos: [
    { id: "ogo-1", title: "Double Digit 8.8", date: "8 Ogos 2026", type: "Double Digit" },
    { id: "ogo-2", title: "Hari Kebangsaan", date: "31 Ogos 2026", type: "Seasonal / Mega Perayaan" },
    { id: "ogo-3", title: "Payday & Month End", date: "24-31 Ogos 2026", type: "Payday & Month End" }
  ],
  September: [
    { id: "sep-1", title: "Double Digit 9.9", date: "9 September 2026", type: "Double Digit" },
    { id: "sep-2", title: "Hari Malaysia", date: "16 September 2026", type: "Seasonal / Brand Event" },
    { id: "sep-3", title: "Payday & Month End", date: "24-30 September 2026", type: "Payday & Month End" }
  ],
  Oktober: [
    { id: "okt-1", title: "Double Digit 10.10", date: "10 Oktober 2026", type: "Double Digit" },
    { id: "okt-2", title: "Halloween", date: "31 Oktober 2026", type: "Seasonal / Mega Perayaan" },
    { id: "okt-3", title: "Payday & Month End", date: "24-31 Oktober 2026", type: "Payday & Month End" }
  ],
  November: [
    { id: "nov-1", title: "Double Digit 11.11", date: "11 November 2026", type: "Double Digit" },
    { id: "nov-2", title: "Deepavali", date: "8 November 2026", type: "Seasonal / Mega Perayaan" },
    { id: "nov-3", title: "Payday & Month End", date: "24-30 November 2026", type: "Payday & Month End" }
  ],
  Disember: [
    { id: "dis-1", title: "Double Digit 12.12", date: "12 Disember 2026", type: "Double Digit" },
    { id: "dis-2", title: "Christmas", date: "25 Disember 2026", type: "Seasonal / Mega Perayaan" },
    { id: "dis-3", title: "Payday & Year End Grand Finale", date: "24-31 Disember 2026", type: "Payday & Month End" }
  ]
};

const defaultCampaignData = {};
Object.keys(rawDefaultCampaignData).forEach(m => {
  defaultCampaignData[m] = rawDefaultCampaignData[m].map(c => ({
    ...c,
    tasks: getStandardRaciTemplate(),
    phaseDates: { 'PRE-CAMPAIGN': '', 'LAUNCH (HARI EVENT)': '', 'POST-CAMPAIGN': '' },
    ...defaultStrategyBlueprint
  }));
});

const getCampaignBadgeStyle = (type) => {
  const normalized = typeof type === 'string' ? type.toLowerCase() : "";
  if (normalized.includes("double digit")) return "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200";
  if (normalized.includes("mega perayaan")) return "bg-rose-50 text-rose-700 border border-rose-200";
  if (normalized.includes("brand event") || normalized.includes("personal branding")) return "bg-sky-50 text-sky-700 border border-sky-200";
  if (normalized.includes("payday")) return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-teal-50 text-teal-700 border border-teal-200";
};

// Fungsi Render Senarai Bernombor (Untuk memisahkan nama dari baris baru \n atau /)
const renderNumberedList = (text, IconComponent, textClass) => {
  const items = String(text || "").split(/\n|\//).map(i => i.trim()).filter(Boolean);
  if (items.length === 0) return <span>-</span>;
  if (items.length === 1) return <span className={`font-bold flex items-start gap-1.5 ${textClass}`}><IconComponent className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60"/> {items[0]}</span>;
  
  return (
    <ol className={`list-decimal pl-4 space-y-0.5 font-bold ${textClass}`}>
      {items.map((item, i) => <li key={i} className="pl-1">{item}</li>)}
    </ol>
  );
};

export default function App() {
  const months = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
  const years = ["2026", "2027", "2028", "2029", "2030"];
  
  // Navigation & Date States
  const [activeTab, setActiveTab] = useState("timeline"); 
  const [activeYear, setActiveYear] = useState("2026");
  const [activeMonth, setActiveMonth] = useState("Januari");
  
  const [campaigns, setCampaigns] = useState(() => {
    const initStruct = {};
    years.forEach(y => {
      initStruct[y] = {};
      months.forEach(m => { initStruct[y][m] = y === "2026" ? defaultCampaignData[m] : []; });
    });
    return initStruct;
  });

  const [selectedCampaignId, setSelectedCampaignId] = useState("jan-1");
  const [searchQuery, setSearchQuery] = useState("");
  const [editTaskId, setEditTaskId] = useState(null);
  
  // Phase Date Editing State
  const [editingPhase, setEditingPhase] = useState(null);
  const [phaseDateVal, setPhaseDateVal] = useState("");

  // Sync Status
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("connecting");

  // Multi-Editor Seat Security (Max 10 Slots)
  const [editorPin, setEditorPin] = useState(""); 
  const [cloudEditors, setCloudEditors] = useState([]); 
  const [showPinModal, setShowPinModal] = useState(false); 
  const [showSeatsModal, setShowSeatsModal] = useState(false); 
  const [inputName, setInputName] = useState(""); 
  const [inputPin, setInputPin] = useState(""); 
  const [pinError, setPinError] = useState(""); 
  const [showSetupPinModal, setShowSetupPinModal] = useState(false); 
  const [newPin, setNewPin] = useState("");
  const [newEditorName, setNewEditorName] = useState("");

  const isEditor = useMemo(() => user && cloudEditors.some(e => e.uid === user.uid), [user, cloudEditors]);
  const currentEditorName = useMemo(() => user && cloudEditors.find(e => e.uid === user.uid)?.name || "", [user, cloudEditors]);

  // Handle Dynamic Unlock Flow
  const handleOpenUnlock = () => {
    if (!editorPin) {
      setShowSetupPinModal(true);
    } else {
      setShowPinModal(true);
    }
  };

  // Derived Campaign States
  const activeYearMonthCampaigns = useMemo(() => campaigns[activeYear]?.[activeMonth] || [], [campaigns, activeYear, activeMonth]);
  const currentCampaign = useMemo(() => activeYearMonthCampaigns.find(c => c.id === selectedCampaignId) || activeYearMonthCampaigns[0] || null, [activeYearMonthCampaigns, selectedCampaignId]);

  const filteredTasks = useMemo(() => {
    if (!currentCampaign) return [];
    if (!searchQuery) return currentCampaign.tasks || [];
    return (currentCampaign.tasks || []).filter(t => 
      String(t.item||'').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(t.r||'').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(t.a||'').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(t.phase||'').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [currentCampaign, searchQuery]);

  // Modals & Form states
  const [isEditingStrategy, setIsEditingStrategy] = useState(false);
  const [strategyEditForm, setStrategyEditForm] = useState({ target: "", tempoh: "", itemTimeline: "", team: "", tracking: "", market: "", medium: "", message: "" });
  const [editForm, setEditForm] = useState({ item: '', dueDate: '', r: '', a: '', note: '', status: '' });
  
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignModalMode, setCampaignModalMode] = useState("add"); 
  const [selectedCampaignForEdit, setSelectedCampaignForEdit] = useState(null);
  const [campaignForm, setCampaignForm] = useState({ title: "", date: "", type: "Double Digit", month: "Januari", year: "2026" });
  const [campaignError, setCampaignError] = useState("");
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: null });

  // Realtime Database Listeners
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (err) { setSyncStatus("error"); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'settings');
    const unsubConfig = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setEditorPin(d.editorPin || ""); setCloudEditors(d.editors || []);
      } else {
        setShowSetupPinModal(true);
      }
    });

    const q = collection(db, 'artifacts', appId, 'public', 'data', 'months_data');
    const unsubData = onSnapshot(q, (snap) => {
      const upStr = {};
      years.forEach(y => { upStr[y] = {}; months.forEach(m => upStr[y][m] = []); });
      let hasData = false;
      snap.forEach(d => {
        const parts = d.id.split('_');
        if (parts.length === 2 && years.includes(parts[0]) && months.includes(parts[1])) {
          upStr[parts[0]][parts[1]] = d.data().campaigns || [];
          hasData = true;
        }
      });
      if (hasData) setCampaigns(upStr);
      else initializeCloudWithDefault();
      setLoading(false); setSyncStatus("cloud-synced");
    }, () => { setSyncStatus("error"); setLoading(false); });

    return () => { unsubConfig(); unsubData(); };
  }, [user]);

  const initializeCloudWithDefault = async () => {
    setSyncStatus("saving");
    try {
      for (const y of years) {
        for (const m of months) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'months_data', `${y}_${m}`), {
            campaigns: y === "2026" ? defaultCampaignData[m] : []
          });
        }
      }
      setSyncStatus("cloud-synced");
    } catch (e) { setSyncStatus("error"); }
  };

  // ==========================================
  // CLOUD MUTATORS & SECURITY
  // ==========================================
  const updateCampaignsForYearMonth = async (year, monthName, newCamps) => {
    if (!isEditor) { handleOpenUnlock(); return; }
    setCampaigns(prev => ({ ...prev, [year]: { ...prev[year], [monthName]: newCamps } }));
    if (user) {
      setSyncStatus("saving");
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'months_data', `${year}_${monthName}`), { campaigns: newCamps });
        setSyncStatus("cloud-synced");
      } catch (e) { setSyncStatus("error"); }
    }
  };

  const handleSetupPin = async (e) => {
    e.preventDefault();
    if (newPin.length < 4 || !newEditorName.trim()) { alert("Form not complete."); return; }
    setSyncStatus("saving");
    try {
      const eds = [{ uid: user.uid, name: newEditorName.trim(), claimedAt: Date.now() }];
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'settings'), { editorPin: newPin, editors: eds });
      setShowSetupPinModal(false);
    } catch (e) { setSyncStatus("error"); }
  };

  const handleClaimSeat = async (e) => {
    e.preventDefault();
    setPinError("");
    if (inputPin !== editorPin) { setPinError("Invalid PIN!"); return; }
    if (!inputName.trim()) { setPinError("Please enter a name."); return; }
    if (cloudEditors.length >= 10) { setPinError("Editor slots are full!"); return; }
    setSyncStatus("saving");
    try {
      const eds = [...cloudEditors, { uid: user.uid, name: inputName.trim(), claimedAt: Date.now() }];
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'settings'), { editorPin, editors: eds });
      setShowPinModal(false); setInputPin(""); setInputName("");
    } catch (e) { setSyncStatus("error"); }
  };

  const handleReleaseSeat = async (targetUid) => {
    if (!isEditor) return;
    setConfirmModal({
      show: true, title: "Tamat Sesi Editor?", message: "Adakah anda pasti membuang editor ini dari senarai akses aktif?",
      onConfirm: async () => {
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null });
        setSyncStatus("saving");
        try {
          const eds = cloudEditors.filter(e => e.uid !== targetUid);
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'settings'), { editorPin, editors: eds });
        } catch (e) { setSyncStatus("error"); }
      }
    });
  };

  const handleLeaveOwnSeat = () => { if (user?.uid) handleReleaseSeat(user.uid); };

  const handleResetData = () => {
    if (!isEditor) { handleOpenUnlock(); return; }
    setConfirmModal({
      show: true, title: "Reset All Data?", message: "Set semula SEMUA data perancangan kempen dari 2026-2030 ke tetapan standard asal?",
      onConfirm: async () => {
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null });
        setSyncStatus("saving");
        try {
          const resetD = {};
          years.forEach(y => { resetD[y] = {}; months.forEach(m => resetD[y][m] = y==="2026"?defaultCampaignData[m]:[]); });
          setCampaigns(resetD); setActiveYear("2026"); setActiveMonth("Januari"); setSelectedCampaignId("jan-1");
          for (const y of years) {
            for (const m of months) {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'months_data', `${y}_${m}`), { campaigns: y==="2026"?defaultCampaignData[m]:[] });
            }
          }
          setSyncStatus("cloud-synced");
        } catch (e) { setSyncStatus("error"); }
      }
    });
  };

  const handleYearChange = (year) => {
    setActiveYear(year);
    const yearMonthCamps = campaigns[year]?.[activeMonth] || [];
    setSelectedCampaignId(yearMonthCamps.length > 0 ? yearMonthCamps[0].id : null);
  };

  const handleMonthChange = (month) => {
    setActiveMonth(month);
    const monthCamps = campaigns[activeYear]?.[month] || [];
    setSelectedCampaignId(monthCamps.length > 0 ? monthCamps[0].id : null);
  };

  const handleJumpToRaciWithYear = (y, m, cId) => { setActiveYear(y); setActiveMonth(m); setSelectedCampaignId(cId); setActiveTab("monthly"); };

  const startEditingStrategy = () => {
    if (!isEditor) { handleOpenUnlock(); return; }
    if (!currentCampaign) return;
    setStrategyEditForm({
      target: currentCampaign.target || "RM 100,000 Sales / 5,000 Units Sold", tempoh: currentCampaign.date || currentCampaign.tempoh || "5 Hari",
      itemTimeline: currentCampaign.timeline || "Pre, Launch, Post", team: currentCampaign.team || "All Team",
      tracking: currentCampaign.tracking || "Sheets Dashboard", market: currentCampaign.market || "General",
      medium: currentCampaign.medium || "Social Ads", message: currentCampaign.message || "Main Hook"
    });
    setIsEditingStrategy(true);
  };

  const saveStrategyChanges = () => {
    if (!isEditor || !currentCampaign) return;
    const upd = activeYearMonthCampaigns.map(c => c.id === currentCampaign.id ? { 
      ...c, target: strategyEditForm.target, date: strategyEditForm.tempoh, tempoh: strategyEditForm.tempoh,
      timeline: strategyEditForm.itemTimeline, team: strategyEditForm.team, tracking: strategyEditForm.tracking,
      market: strategyEditForm.market, medium: strategyEditForm.medium, message: strategyEditForm.message 
    } : c);
    updateCampaignsForYearMonth(activeYear, activeMonth, upd);
    setIsEditingStrategy(false);
  };

  // TASKS CRUD & DIRECT REORDER
  const handleStartEditTask = (task) => {
    if (!isEditor) { handleOpenUnlock(); return; }
    setEditTaskId(task.id);
    setEditForm({ item: task.item, dueDate: task.dueDate || '-', r: task.r, a: task.a, note: task.note || '', status: task.status });
  };

  const handleSaveTaskEdit = (cId, tId) => {
    const upd = activeYearMonthCampaigns.map(c => c.id === cId ? { ...c, tasks: (c.tasks||[]).map(t => t.id === tId ? { ...t, ...editForm } : t) } : c);
    updateCampaignsForYearMonth(activeYear, activeMonth, upd);
    setEditTaskId(null);
  };

  // Fungsi menyimpan tarikh untuk phase
  const handleSavePhaseDate = (cId, phase) => {
    if (!isEditor) return;
    const upd = activeYearMonthCampaigns.map(c => {
      if (c.id === cId) {
        const currentPhaseDates = c.phaseDates || {};
        return { ...c, phaseDates: { ...currentPhaseDates, [phase]: phaseDateVal } };
      }
      return c;
    });
    updateCampaignsForYearMonth(activeYear, activeMonth, upd);
    setEditingPhase(null);
  };

  const handleAddNewTask = (phase) => {
    if (!isEditor) { handleOpenUnlock(); return; }
    if (!currentCampaign) return;
    const nt = { id: Date.now(), phase, item: "New Task Description", dueDate: "-", r: "TBD", a: "TBD", status: "Pending", note: "" };
    const upd = activeYearMonthCampaigns.map(c => c.id === currentCampaign.id ? { ...c, tasks: [...(c.tasks||[]), nt] } : c);
    updateCampaignsForYearMonth(activeYear, activeMonth, upd);
  };

  const handleDeleteTask = (cId, tId) => {
    if (!isEditor) { handleOpenUnlock(); return; }
    setConfirmModal({
      show: true, title: "Delete RACI Task?", message: "Adakah anda pasti mahu memadam tugasan ini?",
      onConfirm: () => {
        const upd = activeYearMonthCampaigns.map(c => c.id === cId ? { ...c, tasks: (c.tasks||[]).filter(t => t.id !== tId) } : c);
        updateCampaignsForYearMonth(activeYear, activeMonth, upd);
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null });
      }
    });
  };

  // Fungsi Tukar Posisi Langsung (Jump to position)
  const handleMoveTaskToPosition = (cId, tId, newIdx) => {
    if (!isEditor) { handleOpenUnlock(); return; }
    const upd = activeYearMonthCampaigns.map(c => {
      if (c.id === cId) {
        const tasksList = [...(c.tasks || [])];
        const targetTask = tasksList.find(t => t.id === tId);
        if (!targetTask) return c;

        const taskPhase = targetTask.phase;
        const phaseTasks = tasksList.filter(t => t.phase === taskPhase);
        
        // Reorder list dalam fasa tersebut sahaja
        const oldPhaseIdx = phaseTasks.findIndex(t => t.id === tId);
        phaseTasks.splice(oldPhaseIdx, 1);
        phaseTasks.splice(newIdx, 0, targetTask);

        // Gabung semula semua fasa
        const pre = taskPhase === 'PRE-CAMPAIGN' ? phaseTasks : tasksList.filter(t => t.phase === 'PRE-CAMPAIGN');
        const launch = taskPhase === 'LAUNCH (HARI EVENT)' ? phaseTasks : tasksList.filter(t => t.phase === 'LAUNCH (HARI EVENT)');
        const post = taskPhase === 'POST-CAMPAIGN' ? phaseTasks : tasksList.filter(t => t.phase === 'POST-CAMPAIGN');

        return { ...c, tasks: [...pre, ...launch, ...post] };
      }
      return c;
    });
    updateCampaignsForYearMonth(activeYear, activeMonth, upd);
  };

  // CAMPAIGN CRUD
  const handleOpenAddCampaignModal = (monthName = activeMonth) => {
    if (!isEditor) { handleOpenUnlock(); return; }
    setCampaignError(""); setCampaignModalMode("add");
    setCampaignForm({ title: "", date: "e.g. 1-5 Aug", type: "Double Digit", month: monthName, year: activeYear });
    setShowCampaignModal(true);
  };

  const handleOpenEditCampaignModal = (campaign) => {
    if (!isEditor) { handleOpenUnlock(); return; }
    setCampaignError(""); setCampaignModalMode("edit"); setSelectedCampaignForEdit(campaign);
    setCampaignForm({ title: campaign.title, date: campaign.date || campaign.tempoh || "", type: campaign.type, month: activeMonth, year: activeYear });
    setShowCampaignModal(true);
  };

  const handleSaveCampaignModal = (e) => {
    e.preventDefault();
    if (!campaignForm.title.trim()) { setCampaignError("Please enter a campaign title."); return; }
    const { year: y, month: m } = campaignForm;
    if (campaignModalMode === "add") {
      const nc = { 
        id: `${m.substring(0,3).toLowerCase()}-${Date.now()}`, 
        title: campaignForm.title, 
        date: campaignForm.date, 
        type: campaignForm.type, 
        tasks: getStandardRaciTemplate(), 
        phaseDates: { 'PRE-CAMPAIGN': '', 'LAUNCH (HARI EVENT)': '', 'POST-CAMPAIGN': '' },
        ...defaultStrategyBlueprint 
      };
      updateCampaignsForYearMonth(y, m, [...(campaigns[y]?.[m]||[]), nc]);
      setActiveYear(y); setActiveMonth(m); setSelectedCampaignId(nc.id);
    } else {
      const upd = (campaigns[y]?.[m]||[]).map(c => c.id === selectedCampaignForEdit.id ? { ...c, title: campaignForm.title, date: campaignForm.date, tempoh: campaignForm.date, type: campaignForm.type } : c);
      updateCampaignsForYearMonth(y, m, upd);
    }
    setShowCampaignModal(false);
  };

  const handleDeleteCampaign = (campaignId) => {
    if (!isEditor) { handleOpenUnlock(); return; }
    setConfirmModal({
      show: true, title: "Padam Kempen?", message: "Adakah anda pasti? Rekod ini tidak boleh dipulihkan.",
      onConfirm: () => {
        const upd = activeYearMonthCampaigns.filter(c => c.id !== campaignId);
        updateCampaignsForYearMonth(activeYear, activeMonth, upd);
        setSelectedCampaignId(upd.length > 0 ? upd[0].id : null);
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null });
      }
    });
  };

  const exportToCSV = () => {
    if (!currentCampaign) return;
    let csvContent = "data:text/csv;charset=utf-8,Phase,Tugasan (Action Item),Due Date,Responsible (R),Accountable (A),Status,Remarks\n";
    (currentCampaign.tasks || []).forEach(t => { csvContent += `"${t.phase}","${t.item.replace(/\n/g, ' ')}","${t.dueDate||'-'}","${t.r.replace(/\n/g, ' ')}","${t.a.replace(/\n/g, ' ')}","${t.status}","${t.note.replace(/\n/g, ' ')}"\n`; });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `RACI_${activeMonth}_${(currentCampaign.title || "export").replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // Stats Computations
  const statsOverview = useMemo(() => {
    let tCamp=0, tTask=0, cTask=0;
    months.forEach(m => {
      const mc = campaigns[activeYear]?.[m] || [];
      tCamp += mc.length;
      mc.forEach(c => (c.tasks||[]).forEach(t => { tTask++; if (t.status === "Completed") cTask++; }));
    });
    return { totalCamps: tCamp, totalTasks: tTask, completedTasks: cTask, overallProgress: tTask > 0 ? Math.round((cTask/tTask)*100) : 0 };
  }, [campaigns, activeYear]);

  const statsMonthly = useMemo(() => {
    let tTask=0, cTask=0, ipTask=0, pTask=0;
    const picWorkload = {};
    activeYearMonthCampaigns.forEach(c => {
      (c.tasks||[]).forEach(t => {
        tTask++;
        if (t.status === "Completed") cTask++; else if (t.status === "In Progress") ipTask++; else pTask++;
        
        // Memisahkan nama untuk pengiraan beban kerja secara individu
        if (t.r) {
          const names = t.r.split(/\n|\//).map(n => n.trim()).filter(Boolean);
          names.forEach(n => { picWorkload[n] = (picWorkload[n] || 0) + 1; });
        }
      });
    });
    // Removed slice(0, 5) to show all team members without hiding anyone
    return { 
      totalCampaigns: activeYearMonthCampaigns.length, totalTasks: tTask, completedTasks: cTask, inProgressTasks: ipTask, pendingTasks: pTask, 
      topPICs: Object.entries(picWorkload).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    };
  }, [activeYearMonthCampaigns]);

  // View Components
  const renderCampaignCard = (camp, monthContext) => {
    const campTotal = (camp.tasks || []).length;
    const campDone = (camp.tasks || []).filter(t => t.status === "Completed").length;
    const campPercent = campTotal > 0 ? Math.round((campDone / campTotal) * 100) : 0;
    const isCampSelected = activeTab === "monthly" && activeMonth === monthContext && camp.id === selectedCampaignId;
    
    return (
      <div 
        key={camp.id} 
        onClick={() => { if(activeTab === "monthly") setSelectedCampaignId(camp.id); }}
        className={`w-full text-left p-4 md:p-5 rounded-2xl transition cursor-pointer border bg-white ${
          isCampSelected 
            ? 'ring-2 ring-emerald-500 border-transparent shadow-md' 
            : 'border-slate-100 hover:border-slate-200 hover:shadow-sm'
        }`}
      >
        <div className="flex justify-between items-start gap-2 mb-2">
          <span className={`text-[10px] uppercase px-2 py-0.5 rounded-md font-bold tracking-wider ${getCampaignBadgeStyle(camp.type)}`}>
            {String(camp.type || "").split("/")[0]}
          </span>
          {activeTab === "monthly" && (
            <div className="flex gap-1">
              <button onClick={(e) => { e.stopPropagation(); isEditor ? handleOpenEditCampaignModal(camp) : handleOpenUnlock(); }} className="text-slate-400 hover:text-emerald-600 p-1 rounded-md hover:bg-emerald-50 transition"><Edit2 className="w-3.5 h-3.5" /></button>
              {isEditor && <button onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(camp.id); }} className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition"><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
          )}
        </div>
        
        <h4 className="text-[13px] md:text-sm font-extrabold text-slate-800 mb-1.5 leading-tight">{camp.title}</h4>
        <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mb-3">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {camp.date || camp.tempoh}
        </p>
        
        {activeTab === "timeline" ? (
          <div className="flex items-center gap-4 justify-between mt-4 pt-3 border-t border-slate-50">
            <div className="w-full">
              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${campPercent}%` }}></div>
              </div>
            </div>
            <button onClick={() => handleJumpToRaciWithYear(activeYear, monthContext, camp.id)} className="text-[10px] font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-1 transition uppercase tracking-wider">
              Buka <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${campPercent}%` }}></div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center"><RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" /><h3 className="font-bold text-slate-700">Syncing System...</h3></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased pb-20">
      
      {/* HEADER UTAMA KORPORAT */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="bg-slate-900 text-white p-2.5 rounded-xl"><Coffee className="w-5 h-5" /></div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">HIMCOFFEE RACI MASTER</h1>
              <p className="text-[11px] font-medium text-slate-500 tracking-wide uppercase">Operational Planning & Strategy Board</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setShowSeatsModal(true)} className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition"><Users className="w-3.5 h-3.5 text-slate-400"/> {cloudEditors.length}/10 Editors</button>
            
            {isEditor ? (
              <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3.5 py-2 rounded-lg text-xs font-bold border border-emerald-200">
                <Unlock className="w-3.5 h-3.5" /> {currentEditorName} <button onClick={handleLeaveOwnSeat} className="ml-2 text-emerald-600 hover:text-rose-600 transition"><UserMinus className="w-3.5 h-3.5"/></button>
              </div>
            ) : (
              <button onClick={handleOpenUnlock} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition">
                <Lock className="w-3.5 h-3.5 text-emerald-400"/> Guest Mode
              </button>
            )}

            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-slate-50 border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {syncStatus === 'saving' ? <><RefreshCw className="w-3 h-3 text-amber-500 animate-spin"/> Syncing...</> : syncStatus === 'cloud-synced' ? <><Check className="w-3 h-3 text-emerald-500"/> Synced</> : <><AlertCircle className="w-3 h-3 text-rose-500"/> Error</>}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6">

        {/* BANNER GUEST MODE */}
        {!isEditor && (
          <div className="mb-6 bg-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-3.5">
              <div className="bg-slate-700 p-2 rounded-lg shrink-0">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide uppercase">GUEST MODE (VIEW ONLY)</h3>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">You are in Guest Mode. Akses menyunting (Edit) dan kawalan strategik dikunci untuk tujuan keselamatan pangkalan data.</p>
              </div>
            </div>
            <button onClick={handleOpenUnlock} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm">
              <KeyRound className="w-3.5 h-3.5"/> Unlock Edit Mode
            </button>
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-slate-200 mb-8">
          <button onClick={() => setActiveTab("timeline")} className={`px-6 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === "timeline" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            <Calendar className="w-4 h-4" /> Master Timeline
          </button>
          <button onClick={() => setActiveTab("monthly")} className={`px-6 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === "monthly" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            <FileSpreadsheet className="w-4 h-4" /> RACI Worksheet
          </button>
        </div>

        {/* YEAR SELECTOR */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-center bg-white border border-slate-200 rounded-2xl p-2 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3 px-4 py-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Pilih Tahun Operasi</span>
          </div>
          <div className="flex bg-slate-50 p-1 rounded-xl gap-1 w-full md:w-auto overflow-x-auto">
            {years.map(y => (
              <button 
                key={y} 
                onClick={() => handleYearChange(y)} 
                className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                  activeYear === y 
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60' 
                    : 'bg-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* TIMELINE VIEW TAB */}
        {activeTab === "timeline" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-end mb-4 px-2">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Timeline {activeYear}</h2>
                <p className="text-xs text-slate-500 mt-1">Saringan peratusan kerja mengikut agihan peranan bulanan.</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-widest">KPI Prestasi</span>
                <div className="text-xl font-black text-emerald-600">{statsOverview.overallProgress}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {months.map((month, idx) => (
                <div key={month} className="bg-slate-50/50 border border-slate-200 rounded-2xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-extrabold text-slate-800 text-sm uppercase">{idx+1}. {month}</h3>
                    {isEditor && <button onClick={() => handleOpenAddCampaignModal(month)} className="text-[10px] font-bold text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded bg-white border border-slate-200 transition">Tambah</button>}
                  </div>
                  <div className="space-y-3">
                    {campaigns[activeYear]?.[month]?.length > 0 
                      ? campaigns[activeYear][month].map(camp => renderCampaignCard(camp, month))
                      : <p className="text-[11px] text-slate-400 italic text-center py-6 bg-white rounded-xl border border-slate-100 border-dashed">Tiada rekod kempen.</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MONTHLY RACI SHEET & STRATEGY VIEW */}
        {activeTab === "monthly" && (
          <div className="animate-fadeIn space-y-6">
            <div className="flex overflow-x-auto gap-2 pb-2 mb-4 scrollbar-hide">
              {months.map(m => (
                <button 
                  key={m} 
                  onClick={() => handleMonthChange(m)} 
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                    activeMonth === m 
                      ? 'bg-slate-800 text-white shadow-sm' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Sidebar list */}
              <div className="xl:col-span-1">
                <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Senarai Kempen</h3>
                    <button onClick={isEditor ? () => handleOpenAddCampaignModal(activeMonth) : handleOpenUnlock} className={`p-1.5 rounded-md transition ${isEditor ? 'bg-white text-emerald-600 border border-slate-200 hover:bg-emerald-50' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} title={isEditor ? 'Add Campaign' : 'Unlock to Add'}><Plus className="w-3.5 h-3.5"/></button>
                  </div>
                  <div className="space-y-2.5">
                    {activeYearMonthCampaigns.map(c => renderCampaignCard(c, activeMonth))}
                    {activeYearMonthCampaigns.length === 0 && <p className="text-xs text-slate-400 text-center py-6 italic border border-dashed border-slate-200 rounded-xl bg-white">Tiada rekod.</p>}
                  </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm mt-5">
                  <h4 className="font-bold text-[11px] text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Beban Kerja PIC ({activeMonth})</h4>
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2">
                    {statsMonthly.topPICs.map((pic, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs"><span className="font-bold text-slate-700">{pic.name}</span><span className="text-slate-400 font-medium">{pic.count} Tasks</span></div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(pic.count / (statsMonthly.totalTasks || 1)) * 100}%` }}></div></div>
                      </div>
                    ))}
                    {statsMonthly.topPICs.length === 0 && <p className="text-xs text-slate-400 italic">Data belum tersedia.</p>}
                  </div>
                </div>
              </div>

              {/* Main RACI section */}
              <div className="xl:col-span-3 space-y-6">
                {currentCampaign ? (
                  <>
                    {/* Strategy Framework */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-800">Strategy Blueprint</h3>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Framework 5T & 3M</p>
                        </div>
                        {isEditor ? (
                          isEditingStrategy ? (
                            <div className="flex gap-2">
                              <button onClick={() => setIsEditingStrategy(false)} className="text-xs font-bold text-slate-500 px-4 py-2 rounded-lg border hover:bg-slate-50 transition">Cancel</button>
                              <button onClick={saveStrategyChanges} className="text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 px-4 py-2 rounded-lg flex items-center gap-1.5 transition"><Check className="w-3.5 h-3.5"/> Save</button>
                            </div>
                          ) : (
                            <button onClick={startEditingStrategy} className="text-xs font-bold text-slate-600 px-4 py-2 rounded-lg border hover:bg-slate-50 flex items-center gap-1.5 transition"><Edit2 className="w-3.5 h-3.5 text-slate-400"/> Edit</button>
                          )
                        ) : (
                          <button onClick={handleOpenUnlock} className="text-[10px] font-bold text-slate-500 px-3 py-1.5 rounded-lg border flex items-center gap-1.5 hover:bg-slate-50 transition" title="Unlock Edit Mode">
                            <Lock className="w-3 h-3" /> VIEW ONLY
                          </button>
                        )}
                      </div>

                      <div className="p-5 md:p-6">
                        {isEditingStrategy ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs animate-fadeIn">
                            <div className="space-y-4">
                              <h4 className="font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">5T Operational Metrics</h4>
                              {[['target', 'Target (Sales/Units)'], ['tempoh', 'Tempoh (Duration)'], ['itemTimeline', 'Timeline (Fasa Utama)'], ['team', 'Team (PIC Terlibat)'], ['tracking', 'Tracking (Ukur KPI)']].map(([f, l]) => (
                                <div key={f}>
                                  <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1.5">{l}</label>
                                  <input type="text" value={strategyEditForm[f]} onChange={(e) => setStrategyEditForm({...strategyEditForm, [f]: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs outline-none focus:border-emerald-500 font-semibold transition" />
                                </div>
                              ))}
                            </div>
                            <div className="space-y-4">
                              <h4 className="font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">3M Strategic Messaging</h4>
                              {[['market', 'Market (Audience Segments)'], ['medium', 'Medium (Saluran Iklan)'], ['message', 'Message (Angle Copywriting / Hook)']].map(([f, l]) => (
                                <div key={f}>
                                  <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1.5">{l}</label>
                                  <textarea rows="4" value={strategyEditForm[f]} onChange={(e) => setStrategyEditForm({...strategyEditForm, [f]: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs outline-none focus:border-emerald-500 font-semibold transition resize-none" />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
                            <div>
                              <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-4">5T Operational Plan</h4>
                              <div className="grid grid-cols-2 gap-4">
                                {[
                                  ['Target', currentCampaign.target], 
                                  ['Tempoh', currentCampaign.tempoh || currentCampaign.date], 
                                  ['Timeline', currentCampaign.timeline], 
                                  ['Team', currentCampaign.team], 
                                  ['Tracking', currentCampaign.tracking]
                                ].map(([l, v]) => (
                                  <div key={l} className="border-l-2 border-slate-200 pl-3">
                                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">{l}</span>
                                    <p className="text-xs font-bold text-slate-800 mt-1 leading-relaxed">{v || "-"}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-4">3M Marketing Funnel</h4>
                              <div className="space-y-4">
                                {[
                                  ['Market', currentCampaign.market, 'emerald'], 
                                  ['Medium', currentCampaign.medium, 'sky'], 
                                  ['Message', currentCampaign.message, 'rose']
                                ].map(([l, v, c]) => (
                                  <div key={l} className="border-l-2 border-slate-200 pl-3">
                                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">{l} Strategy</span>
                                    <p className="text-xs font-bold text-slate-800 mt-1 leading-relaxed">{v || "-"}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RACI Matrix Schedule */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                          <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-md ${getCampaignBadgeStyle(currentCampaign.type)}`}>{currentCampaign.type}</span>
                          <h3 className="text-lg font-black text-slate-900 mt-2">{currentCampaign.title}</h3>
                        </div>
                        <div className="flex gap-3 items-center">
                          <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <input type="text" placeholder="Cari tugasan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-xs w-48 outline-none focus:border-emerald-500 transition" />
                          </div>
                          <button onClick={exportToCSV} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm" title="Eksport data ke CSV"><Download className="w-4 h-4"/></button>
                        </div>
                      </div>

                      <div className="overflow-x-auto relative">
                        <table className="w-full text-left whitespace-nowrap">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                              <th className="p-4 w-10 text-center">No</th>
                              <th className="p-4 min-w-[300px]">Action Items (Tugasan Utama)</th>
                              <th className="p-4 w-36 text-emerald-700 bg-emerald-50/50">🗓️ Tarikh (Due)</th>
                              <th className="p-4 w-36">Responsible (R)</th>
                              <th className="p-4 w-36">Accountable (A)</th>
                              <th className="p-4 w-28 text-center">Status</th>
                              <th className="p-4 w-44">Notes / Remarks</th>
                              <th className="p-4 min-w-[120px] text-center sticky right-0 bg-slate-50 z-20 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.05)] border-l border-slate-200">
                                {isEditor ? 'Tindakan' : <Lock className="w-3.5 h-3.5 mx-auto text-slate-400" title="Locked"/>}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-medium">
                            {['PRE-CAMPAIGN', 'LAUNCH (HARI EVENT)', 'POST-CAMPAIGN'].map(phase => {
                              const phaseTasks = filteredTasks.filter(t => t.phase === phase);
                              return (
                                <React.Fragment key={phase}>
                                  <tr className="bg-slate-50/50 group/phase">
                                    <td colSpan="2" className="p-3.5 font-bold text-[10px] text-slate-700 uppercase tracking-widest border-y border-slate-200">{phase.replace(" (HARI EVENT)","")} PHASE</td>
                                    
                                    {/* RUANGAN TARIKH FASA (PHASE DATE) */}
                                    <td className="p-3.5 border-y border-slate-200">
                                      {editingPhase === phase && isEditor ? (
                                        <div className="flex items-center gap-1.5 w-full max-w-[200px]">
                                          <input type="text" autoFocus value={phaseDateVal} onChange={e => setPhaseDateVal(e.target.value)} placeholder="Cth: 1-5 Ogos" className="w-full border border-emerald-300 rounded-md p-1.5 text-xs outline-none focus:ring-2 focus:ring-emerald-100 bg-white" />
                                          <button onClick={() => handleSavePhaseDate(currentCampaign.id, phase)} className="p-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 shadow-sm"><Check className="w-3.5 h-3.5"/></button>
                                          <button onClick={() => setEditingPhase(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300"><X className="w-3.5 h-3.5"/></button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="inline-flex items-center gap-1.5 bg-white text-slate-700 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-slate-200 shadow-sm whitespace-nowrap">
                                            <Calendar className="w-3 h-3 text-emerald-600"/> 
                                            {currentCampaign.phaseDates?.[phase] || "Tetapkan Tarikh"}
                                          </span>
                                          {isEditor && (
                                            <button onClick={() => { setEditingPhase(phase); setPhaseDateVal(currentCampaign.phaseDates?.[phase] || ""); }} className="opacity-0 group-hover/phase:opacity-100 p-1 text-slate-400 hover:text-emerald-600 transition" title="Edit tarikh fasa">
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                    <td colSpan="4" className="border-y border-slate-200"></td>

                                    <td className="text-center border-y border-slate-200 bg-slate-50/50 sticky right-0 z-10 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.05)] border-l">
                                      {isEditor ? (
                                        <button onClick={() => handleAddNewTask(phase)} className="text-slate-600 bg-white p-1 rounded-md border border-slate-200 hover:text-emerald-600 hover:border-emerald-300 shadow-sm transition"><Plus className="w-3.5 h-3.5"/></button>
                                      ) : (
                                        <button onClick={handleOpenUnlock} className="p-1 rounded text-slate-300 hover:text-emerald-600 transition" title="Unlock to Add Task"><Lock className="w-3.5 h-3.5 mx-auto"/></button>
                                      )}
                                    </td>
                                  </tr>
                                  {phaseTasks.length === 0 ? (
                                    <tr><td colSpan="8" className="text-slate-400 p-5 text-center italic text-xs">Tiada tugasan didokumenkan dalam fasa ini.</td></tr>
                                  ) : (
                                    phaseTasks.map((task, idx) => {
                                      const isEd = editTaskId === task.id;
                                      return (
                                        <tr key={task.id} className="hover:bg-slate-50/50 transition group align-top">
                                          <td className="p-4 text-center font-semibold w-16">
                                            {isEditor ? (
                                              <div className="flex justify-center items-center">
                                                <select 
                                                  value={idx} 
                                                  onChange={(e) => handleMoveTaskToPosition(currentCampaign.id, task.id, parseInt(e.target.value))}
                                                  className="appearance-none bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] rounded-md px-2 py-1 font-bold outline-none cursor-pointer transition text-center shadow-sm"
                                                  title="Tukar kedudukan tugasan"
                                                >
                                                  {phaseTasks.map((_, i) => (
                                                    <option key={i} value={i}>{i + 1}</option>
                                                  ))}
                                                </select>
                                              </div>
                                            ) : (
                                              <span className="text-slate-400">{idx + 1}</span>
                                            )}
                                          </td>
                                          
                                          <td className="p-4 whitespace-normal">
                                            {isEd && isEditor ? <textarea rows="2" value={editForm.item} onChange={(e)=>setEditForm({...editForm, item:e.target.value})} className="w-full border rounded-lg p-2 text-xs outline-none focus:border-emerald-500" /> : <span className="font-bold text-slate-700 leading-snug block">{task.item}</span>}
                                          </td>
                                          
                                          <td className="p-4 bg-emerald-50/30 border-x border-slate-50">
                                            {isEd && isEditor ? (
                                              <input type="text" placeholder="Cth: 1-3 Ogos / H+1" value={editForm.dueDate} onChange={(e)=>setEditForm({...editForm, dueDate:e.target.value})} className="w-full border border-emerald-200 rounded-lg p-1.5 text-xs outline-none focus:border-emerald-500 bg-white" /> 
                                            ) : (
                                              <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold whitespace-nowrap">
                                                <Calendar className="w-3.5 h-3.5 text-emerald-500 opacity-70"/> {task.dueDate && task.dueDate !== "-" ? task.dueDate : "TBD"}
                                              </span>
                                            )}
                                          </td>

                                          <td className="p-4">
                                            {isEd && isEditor ? (
                                              <textarea rows="2" placeholder="Masukkan 1 nama 1 baris (Enter)" value={editForm.r} onChange={(e)=>setEditForm({...editForm, r:e.target.value})} className="w-full border rounded-lg p-2 text-xs outline-none focus:border-emerald-500" /> 
                                            ) : (
                                              renderNumberedList(task.r, Users, "text-slate-600")
                                            )}
                                          </td>

                                          <td className="p-4">
                                            {isEd && isEditor ? (
                                              <textarea rows="2" placeholder="Masukkan 1 nama 1 baris (Enter)" value={editForm.a} onChange={(e)=>setEditForm({...editForm, a:e.target.value})} className="w-full border rounded-lg p-2 text-xs outline-none focus:border-emerald-500" /> 
                                            ) : (
                                              renderNumberedList(task.a, User, "text-slate-800")
                                            )}
                                          </td>

                                          <td className="p-4 text-center">
                                            {isEd && isEditor ? (
                                              <select value={editForm.status} onChange={(e)=>setEditForm({...editForm, status:e.target.value})} className="border rounded-lg p-2 text-[11px] outline-none bg-white font-bold">
                                                <option>Completed</option><option>In Progress</option><option>Pending</option>
                                              </select>
                                            ) : (
                                              <span className={`px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest border uppercase ${task.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : task.status === "In Progress" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>{task.status}</span>
                                            )}
                                          </td>

                                          <td className="p-4">
                                            {isEd && isEditor ? <textarea rows="2" value={editForm.note} onChange={(e)=>setEditForm({...editForm, note:e.target.value})} className="w-full border rounded-lg p-2 text-xs outline-none focus:border-emerald-500" /> : <span className="text-slate-500 italic block truncate max-w-[155px]" title={task.note}>{task.note||"-"}</span>}
                                          </td>

                                          {/* STICKY ACTIONS COLUMN CELL */}
                                          <td className="p-4 text-center align-middle sticky right-0 bg-white group-hover:bg-slate-50/50 z-10 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.05)] border-l border-slate-100 transition-colors">
                                            {isEd && isEditor ? (
                                              <div className="flex gap-1.5 justify-center flex-nowrap">
                                                <button onClick={() => handleSaveTaskEdit(currentCampaign.id, task.id)} className="p-2 text-white bg-slate-800 hover:bg-slate-900 rounded-md shadow-sm transition" title="Simpan"><Check className="w-3.5 h-3.5"/></button>
                                                <button onClick={() => setEditTaskId(null)} className="p-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-md shadow-sm transition" title="Batal"><X className="w-3.5 h-3.5"/></button>
                                              </div>
                                            ) : (
                                              <div className="flex gap-1 justify-center flex-nowrap opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                {!isEditor ? (
                                                  <button onClick={handleOpenUnlock} className="p-1.5 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-md transition" title="Unlock to Edit">
                                                    <Lock className="w-3.5 h-3.5 mx-auto"/>
                                                  </button>
                                                ) : (
                                                  <>
                                                    <button onClick={() => handleStartEditTask(task)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition border border-transparent hover:border-emerald-200" title="Edit row"><Edit2 className="w-3.5 h-3.5"/></button>
                                                    <button onClick={() => handleDeleteTask(currentCampaign.id, task.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition border border-transparent hover:border-rose-200" title="Delete row"><Trash2 className="w-3.5 h-3.5"/></button>
                                                  </>
                                                )}
                                              </div>
                                            )}
                                          </td>
                                        </tr>
                                      )
                                    })
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <Coffee className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="font-extrabold text-slate-400 text-sm tracking-wide">SILA PILIH KEMPEN AKTIF</h3>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-scaleUp">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-sm tracking-wide">{campaignModalMode === "add" ? "CREATE NEW CAMPAIGN" : "EDIT CAMPAIGN INFO"}</h3>
              <button onClick={() => setShowCampaignModal(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
            </div>
            <form onSubmit={handleSaveCampaignModal} className="p-6 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Year / Tahun</label><select value={campaignForm.year} onChange={e=>setCampaignForm({...campaignForm, year:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500 font-bold text-slate-700">{years.map(y=><option key={y}>{y}</option>)}</select></div>
                {campaignModalMode==="add" && <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Month / Bulan</label><select value={campaignForm.month} onChange={e=>setCampaignForm({...campaignForm, month:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500 font-bold text-slate-700">{months.map(m=><option key={m}>{m}</option>)}</select></div>}
              </div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Campaign Title</label><input required type="text" value={campaignForm.title} onChange={e=>setCampaignForm({...campaignForm, title:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500 font-bold text-slate-800" /></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Duration / Date</label><input type="text" value={campaignForm.date} onChange={e=>setCampaignForm({...campaignForm, date:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500 font-bold text-slate-800" /></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Campaign Category</label><select value={campaignForm.type} onChange={e=>setCampaignForm({...campaignForm, type:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500 font-bold text-slate-700"><option>Double Digit</option><option>Seasonal / Micro-Event</option><option>Seasonal / Mega Perayaan</option><option>Seasonal / Brand Event</option><option>Payday & Month End</option></select></div>
              {campaignError && <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg">{campaignError}</p>}
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCampaignModal(false)} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm transition">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl animate-scaleUp">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="font-black text-slate-900 mb-2 text-base tracking-wide">{confirmModal.title}</h3>
            <p className="text-xs text-slate-500 mb-8 leading-relaxed px-4">{confirmModal.message}</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setConfirmModal({show:false, title:"", message:"", onConfirm:null})} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition">Cancel</button>
              <button onClick={confirmModal.onConfirm} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-sm transition">Confirm Action</button>
            </div>
          </div>
        </div>
      )}

      {/* Pin Authorization Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-sm text-slate-800 flex items-center gap-2 tracking-wide"><KeyRound className="w-4 h-4 text-emerald-600"/> UNLOCK EDIT ACCESS</h3>
              <button onClick={() => { setShowPinModal(false); setPinError(""); }}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
            </div>
            <form onSubmit={handleClaimSeat} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">System ni locked. Masukkan Nama & PIN untuk claim slot Editor (Max 10 orang).</p>
              <div className="space-y-3">
                <input required type="text" placeholder="Nama Anda (PIC)" value={inputName} onChange={e=>setInputName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs outline-none focus:border-emerald-500 font-bold" />
                <input required type="password" maxLength="8" placeholder="Security PIN" value={inputPin} onChange={e=>setInputPin(e.target.value)} className="w-full text-center tracking-[0.3em] bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-black outline-none focus:border-emerald-500" />
              </div>
              {pinError && <p className="text-[11px] text-center text-rose-600 bg-rose-50 p-2.5 rounded-lg font-bold">{pinError}</p>}
              <button type="submit" className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-md transition mt-2">Confirm & Unlock Edit Mode 🔓</button>
            </form>
          </div>
        </div>
      )}

      {/* First Run Setup PIN Modal */}
      {showSetupPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scaleUp">
            <div className="px-6 py-5 border-b border-emerald-100 bg-emerald-50 flex justify-between items-center">
              <h3 className="font-black text-sm text-emerald-800 flex items-center gap-2 tracking-wide"><Shield className="w-4 h-4"/> SETUP CLOUD SECURITY PIN</h3>
              <button onClick={() => setShowSetupPinModal(false)}><X className="w-4 h-4 text-emerald-600/50 hover:text-emerald-800" /></button>
            </div>
            <form onSubmit={handleSetupPin} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">Cloud database ni belum ada admin PIN. Sila masukkan Nama & reka PIN (min 4 digit) untuk lock system ni.</p>
              <div className="space-y-3">
                <input required type="text" placeholder="Nama Pentadbir Utama" value={newEditorName} onChange={e=>setNewEditorName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs outline-none focus:border-emerald-500 font-bold" />
                <input required type="password" placeholder="Create Security PIN" value={newPin} onChange={e=>setNewPin(e.target.value)} className="w-full text-center tracking-[0.3em] bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-black outline-none focus:border-emerald-500" />
              </div>
              
              <div className="space-y-2.5 pt-3">
                <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition">Tetapkan PIN & Tuntut Slot #1 🔓</button>
                <button type="button" onClick={() => setShowSetupPinModal(false)} className="w-full py-3 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 rounded-xl text-xs font-bold transition">
                  Skip & Go to Guest Mode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Seats Management View Modal */}
      {showSeatsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scaleUp">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-sm text-slate-800 flex items-center gap-2 tracking-wide"><Users className="w-4 h-4 text-emerald-600" /> ACTIVE EDITOR SEATS ({cloudEditors.length}/10)</h3>
              <button onClick={() => setShowSeatsModal(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
            </div>
            <div className="p-6">
              <div className="space-y-2.5 max-h-60 overflow-y-auto mb-5 pr-1">
                {cloudEditors.map((ed, i) => (
                  <div key={ed.uid} className={`flex justify-between items-center p-3 rounded-xl border ${ed.uid === user?.uid ? 'bg-emerald-50 border-emerald-200' : 'bg-white shadow-sm border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold flex justify-center items-center">{i+1}</span>
                      <div><p className="text-xs font-black text-slate-800">{ed.name} {ed.uid === user?.uid && <span className="text-[9px] text-emerald-600 bg-emerald-100 px-1.5 rounded-md ml-1 font-bold">You</span>}</p></div>
                    </div>
                    {isEditor && <button onClick={() => handleReleaseSeat(ed.uid)} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"><Trash2 className="w-4 h-4"/></button>}
                  </div>
                ))}
                {cloudEditors.length === 0 && <p className="text-center text-xs text-slate-400 italic py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50">No active editors found.</p>}
              </div>
              <button onClick={() => setShowSeatsModal(false)} className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition shadow-sm">Tutup Panel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}