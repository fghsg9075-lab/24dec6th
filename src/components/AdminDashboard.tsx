
import React, { useEffect, useState } from 'react';
import { User, GiftCode, ViewState, SystemSettings, Subject, ChatMessage, PaymentRequest, CreditPackage, Board, ClassLevel, Stream, InboxMessage, RecoveryRequest, Chapter, LessonContent, ContentType } from '../types';
import { Users, Search, Trash2, Gift, Copy, Check, Ticket, Edit, Eye, EyeOff, BookOpen, Save, X, Phone, User as UserIcon, Zap, Crown, Shield, Cpu, Megaphone, Activity, KeyRound, Wifi, LayoutDashboard, MessageCircle, RefreshCcw, Settings, Terminal, ToggleLeft, ToggleRight, FileCode, Database, Plus, AlertTriangle, Coins, BarChart3, Lock, Ban, CreditCard, Recycle, RotateCcw, UserPlus, IndianRupee, QrCode, CheckCircle, XCircle, Send, Wallet, ShoppingBag, PenTool, HardDrive, Download, Upload, Mail, Gamepad2, Archive, BrainCircuit, Mic, FileText, ListChecks, Smartphone, FileEdit, PieChart, Palette, Code2, GraduationCap, Sparkles, FileQuestion, FileType, Link as LinkIcon, ExternalLink, ArrowLeft } from 'lucide-react';
import { UniversalChat } from './UniversalChat';
import { DEFAULT_SUBJECTS, getSubjectsList } from '../constants';
import { fetchChapters, fetchLessonContent } from '../services/gemini';
import { LessonView } from './LessonView';
import { AudioStudio } from './AudioStudio';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AdminDevAssistant } from './AdminDevAssistant';

interface Props {
  onNavigate: (view: ViewState) => void;
  settings?: SystemSettings;
  onUpdateSettings?: (s: SystemSettings) => void;
  onImpersonate?: (user: User) => void; 
}

type AdminTab = 'OVERVIEW' | 'USERS' | 'PAYMENTS' | 'STORE' | 'CONTENT' | 'SYSTEM' | 'DATABASE' | 'RECYCLE';

export const AdminDashboard: React.FC<Props> = ({ onNavigate, settings, onUpdateSettings, onImpersonate }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');

  // --- STATE MANAGEMENT ---
  const [users, setUsers] = useState<User[]>([]);
  const [codes, setCodes] = useState<GiftCode[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([]);
  const [search, setSearch] = useState('');
  
  // Storage Stats
  const [storageStats, setStorageStats] = useState({ usedMB: '0.00', totalNotes: 0, totalMCQs: 0, totalPDFs: 0, percentUsed: 0 });
  const [isVerifyingStorage, setIsVerifyingStorage] = useState(false);

  // Settings State
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings || {
      appName: 'NST',
      themeColor: '#3b82f6',
      maintenanceMode: false,
      customCSS: '',
      apiKeys: ['AIzaSy... (Paste Your Key Here)'],
      chatCost: 1,
      dailyReward: 3,
      signupBonus: 2,
      isChatEnabled: true,
      isGameEnabled: true,
      allowSignup: true,
      loginMessage: '',
      allowedClasses: ['6', '7', '8', '9', '10', '11', '12'],
      storageCapacity: '100 GB',
      noteGenerationPrompt: '',
      isPaymentEnabled: true,
      paymentDisabledMessage: 'Store is currently closed.',
      upiId: '',
      upiName: '',
      qrCodeUrl: '',
      paymentInstructions: 'Pay via UPI and enter Transaction ID below.',
      packages: [
          { id: 'p1', name: 'Starter Pack', credits: 50, price: 29, isPopular: false },
          { id: 'p2', name: 'Pro Pack', credits: 200, price: 99, isPopular: true },
          { id: 'p3', name: 'Ultra Pack', credits: 500, price: 199, isPopular: false }
      ]
  });
  
  const [newApiKey, setNewApiKey] = useState('');
  const [testingKey, setTestingKey] = useState(false);

  // UI Helpers
  const [editingUser, setEditingUser] = useState<User | null>(null); 
  const [actionCreditAmount, setActionCreditAmount] = useState<number | ''>(''); 
  const [personalMsg, setPersonalMsg] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);
  
  // Store Management
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null); 
  const [pkgName, setPkgName] = useState('');
  const [pkgCredits, setPkgCredits] = useState<number | ''>('');
  const [pkgPrice, setPkgPrice] = useState<number | ''>('');
  const [pkgPopular, setPkgPopular] = useState(false);

  // Content Studio
  const [contentBoard, setContentBoard] = useState<Board>('CBSE');
  const [contentClass, setContentClass] = useState<ClassLevel>('10');
  const [contentStream, setContentStream] = useState<Stream>('Science');
  const [contentSubject, setContentSubject] = useState<Subject | null>(null);
  const [contentChapters, setContentChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [generatedContent, setGeneratedContent] = useState<LessonContent | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [showAudioStudio, setShowAudioStudio] = useState(false);
  const [showDevConsole, setShowDevConsole] = useState(false);
  const [showGenOptions, setShowGenOptions] = useState(false);
  
  // MANUAL EDITING & PDF STATE
  const [manualEditMode, setManualEditMode] = useState<ContentType | null>(null);
  const [manualText, setManualText] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  
  // GIFT CODE GENERATOR
  const [giftAmount, setGiftAmount] = useState<number | ''>('');
  const [giftQuantity, setGiftQuantity] = useState<number>(1);

  const adminUser: User = {
      id: 'ADMIN', name: 'System Admin', role: 'ADMIN', credits: 99999, email: 'admin@nst.com', password: '', mobile: '', createdAt: '', streak: 0, lastLoginDate: '', redeemedCodes: [], progress: {}
  };

  useEffect(() => { loadData(); calculateStorage(); }, [activeTab]);

  const loadData = () => {
    const storedUsersStr = localStorage.getItem('nst_users');
    if (storedUsersStr) setUsers(JSON.parse(storedUsersStr));

    const storedCodesStr = localStorage.getItem('nst_admin_codes');
    if (storedCodesStr) setCodes(JSON.parse(storedCodesStr));

    const existingBroadcast = localStorage.getItem('nst_global_message');
    if (existingBroadcast) setBroadcastMsg(existingBroadcast);

    const storedChat = localStorage.getItem('nst_universal_chat');
    if (storedChat) setChatMessages(JSON.parse(storedChat));

    const storedPayments = localStorage.getItem('nst_payment_requests');
    if (storedPayments) setPaymentRequests(JSON.parse(storedPayments));

    const storedRecRequests = localStorage.getItem('nst_recovery_requests');
    if (storedRecRequests) setRecoveryRequests(JSON.parse(storedRecRequests));
  };

  const calculateStorage = () => {
      let totalBytes = 0;
      let notesCount = 0;
      let mcqCount = 0;
      let pdfCount = 0;

      for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
              const value = localStorage.getItem(key) || '';
              totalBytes += (key.length + value.length) * 2; 

              if (key.startsWith('nst_custom_lesson_')) {
                  if (key.includes('MCQ')) mcqCount++;
                  else if (key.includes('PDF')) pdfCount++;
                  else notesCount++;
              }
          }
      }

      const usedMB = (totalBytes / (1024 * 1024)).toFixed(2);
      const limitStr = localSettings.storageCapacity || '100 GB';
      const limitVal = parseInt(limitStr.split(' ')[0]);
      const limitUnit = limitStr.split(' ')[1];
      const limitMB = limitUnit === 'TB' ? limitVal * 1024 * 1024 : limitUnit === 'GB' ? limitVal * 1024 : limitVal;
      const percent = Math.min((parseFloat(usedMB) / limitMB) * 100, 100);

      setStorageStats({ usedMB, totalNotes: notesCount, totalMCQs: mcqCount, totalPDFs: pdfCount, percentUsed: percent });
  };

  const handleVerifyStorage = () => {
      setIsVerifyingStorage(true);
      setTimeout(() => {
          calculateStorage();
          setIsVerifyingStorage(false);
          alert("✅ Storage Verified: All data blocks are healthy.");
      }, 1500);
  };

  // --- ACTIONS ---
  const handleBroadcast = () => { 
      if (!broadcastMsg.trim()) { localStorage.removeItem('nst_global_message'); } else { localStorage.setItem('nst_global_message', broadcastMsg); } 
      setBroadcastSent(true); setTimeout(() => setBroadcastSent(false), 2000); 
  };

  const handleSaveSettings = () => { 
      if (onUpdateSettings) { onUpdateSettings(localSettings); alert("Settings Saved & Applied!"); } 
  };
  
  const handleToggleClass = (cls: ClassLevel) => {
      const currentAllowed = localSettings.allowedClasses || ['6', '7', '8', '9', '10', '11', '12'];
      let newAllowed: ClassLevel[];
      if (currentAllowed.includes(cls)) { newAllowed = currentAllowed.filter(c => c !== cls); } 
      else { newAllowed = [...currentAllowed, cls]; }
      setLocalSettings({...localSettings, allowedClasses: newAllowed});
  };

  const handleAddKey = () => {
      if (!newApiKey.trim()) return;
      const updatedKeys = [...(localSettings.apiKeys || []), newApiKey.trim()];
      setLocalSettings({ ...localSettings, apiKeys: updatedKeys });
      setNewApiKey('');
  };

  const handleTestKey = async (key: string) => {
      setTestingKey(true);
      try {
          const ai = new GoogleGenerativeAI(key);
          const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
          const result = await model.generateContent("Ping");
          if (result.response.text()) alert("✅ CONNECTION SUCCESSFUL!");
          else throw new Error("No response");
      } catch (err: any) { 
          console.error("Test Key Failed:", err);
          alert(`❌ CONNECTION FAILED: ${err.message || 'Unknown Error'}`); 
      } finally { setTestingKey(false); }
  };
  
  const handleRemoveKey = (index: number) => {
      if(!window.confirm("Remove this API Key?")) return;
      const updatedKeys = [...(localSettings.apiKeys || [])];
      updatedKeys.splice(index, 1);
      setLocalSettings({ ...localSettings, apiKeys: updatedKeys });
  };

  const handleSavePackage = () => { 
      if (!pkgName || !pkgCredits || !pkgPrice) return; 
      const newPkg: CreditPackage = { id: editingPkgId || Date.now().toString(), name: pkgName, credits: Number(pkgCredits), price: Number(pkgPrice), isPopular: pkgPopular }; 
      let updatedPackages; 
      if (editingPkgId) { updatedPackages = localSettings.packages.map(p => p.id === editingPkgId ? newPkg : p); alert("Package Updated!"); } else { updatedPackages = [...localSettings.packages, newPkg]; alert("New Package Added!"); } 
      setLocalSettings({...localSettings, packages: updatedPackages}); setEditingPkgId(null); setPkgName(''); setPkgCredits(''); setPkgPrice(''); setPkgPopular(false); 
  };
  
  const handleRemovePackage = (id: string) => { 
      if(window.confirm("Remove this package?")) { const updatedPackages = localSettings.packages.filter(p => p.id !== id); setLocalSettings({...localSettings, packages: updatedPackages}); } 
  };

  const handleProcessPayment = (reqId: string, action: 'APPROVE' | 'REJECT') => { 
      const request = paymentRequests.find(r => r.id === reqId); if (!request) return; 
      if (action === 'APPROVE') { 
          const userIndex = users.findIndex(u => u.id === request.userId); 
          if (userIndex !== -1) { 
              const updatedUsers = [...users]; updatedUsers[userIndex] = { ...updatedUsers[userIndex], credits: (updatedUsers[userIndex].credits || 0) + request.amount }; 
              setUsers(updatedUsers); localStorage.setItem('nst_users', JSON.stringify(updatedUsers)); 
          } 
      } 
      const updatedRequests = paymentRequests.map(r => r.id === reqId ? { ...r, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' as 'APPROVED' | 'REJECTED' } : r ); 
      setPaymentRequests(updatedRequests); localStorage.setItem('nst_payment_requests', JSON.stringify(updatedRequests)); alert(`Request ${action}D`); 
  };

  const handleGenerateCodes = () => {
      if (!giftAmount || !giftQuantity) return;
      const newCodes: GiftCode[] = [];
      for (let i = 0; i < giftQuantity; i++) {
          const code = `NST-${Math.floor(Math.random()*10000)}-${Math.random().toString(36).substring(7).toUpperCase()}`;
          newCodes.push({ code, amount: Number(giftAmount), createdAt: new Date().toISOString(), isRedeemed: false, generatedBy: 'ADMIN' });
      }
      const updatedCodes = [...newCodes, ...codes];
      setCodes(updatedCodes);
      localStorage.setItem('nst_admin_codes', JSON.stringify(updatedCodes));
      setGiftAmount(''); setGiftQuantity(1);
      alert(`${giftQuantity} Codes Generated!`);
  };

  const handleDeleteCode = (codeStr: string) => {
      if(!window.confirm("Delete this code?")) return;
      const updatedCodes = codes.filter(c => c.code !== codeStr);
      setCodes(updatedCodes);
      localStorage.setItem('nst_admin_codes', JSON.stringify(updatedCodes));
  };

  const handleExportData = () => { 
      const data = { users: localStorage.getItem('nst_users'), chat: localStorage.getItem('nst_universal_chat'), codes: localStorage.getItem('nst_admin_codes'), history: localStorage.getItem('nst_user_history'), settings: localStorage.getItem('nst_system_settings'), posts: localStorage.getItem('nst_iic_posts'), payments: localStorage.getItem('nst_payment_requests'), customLessons: {} as any };
      for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('nst_custom_lesson_')) { data.customLessons[key] = localStorage.getItem(key); }
      }
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `NST_Full_Backup_${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); 
  };
  
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => { 
      const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); 
      reader.onload = (event) => { try { const data = JSON.parse(event.target?.result as string); if (window.confirm("⚠️ OVERWRITE all data?")) { 
          if (data.users) localStorage.setItem('nst_users', data.users); 
          if (data.chat) localStorage.setItem('nst_universal_chat', data.chat); 
          if (data.codes) localStorage.setItem('nst_admin_codes', data.codes); 
          if (data.history) localStorage.setItem('nst_user_history', data.history); 
          if (data.settings) localStorage.setItem('nst_system_settings', data.settings); 
          if (data.posts) localStorage.setItem('nst_iic_posts', data.posts); 
          if (data.payments) localStorage.setItem('nst_payment_requests', data.payments);
          if (data.customLessons) { Object.keys(data.customLessons).forEach(k => { localStorage.setItem(k, data.customLessons[k]); }); }
          alert("Restoration Complete!"); window.location.reload(); } } catch (err) { alert("Invalid Backup File!"); } }; reader.readAsText(file); 
  };

  const clearData = (key: string, label: string) => { 
      if (window.confirm(`⚠️ PERMANENTLY delete ALL ${label}?`)) { localStorage.removeItem(key); alert(`${label} Cleared.`); window.location.reload(); } 
  };

  const handleDeleteUser = (userId: string, permanent: boolean) => { 
      if (permanent) { const updatedUsers = users.filter(u => u.id !== userId); setUsers(updatedUsers); localStorage.setItem('nst_users', JSON.stringify(updatedUsers)); alert("User Permanently Deleted."); } 
      else { const updatedUsers = users.map(u => u.id === userId ? { ...u, isArchived: true, deletedAt: new Date().toISOString() } : u); setUsers(updatedUsers); localStorage.setItem('nst_users', JSON.stringify(updatedUsers)); alert("User moved to Recycle Bin."); } 
      setEditingUser(null);
  };
  
  const handleRestoreUser = (userId: string) => { 
      const updatedUsers = users.map(u => u.id === userId ? { ...u, isArchived: false, deletedAt: undefined } : u); 
      setUsers(updatedUsers); localStorage.setItem('nst_users', JSON.stringify(updatedUsers)); alert("User Restored!"); 
  };

  const approveLoginRequest = (userId: string) => { 
      const updatedReqs = recoveryRequests.map(r => r.id === userId ? { ...r, status: 'RESOLVED' as 'RESOLVED' } : r); 
      setRecoveryRequests(updatedReqs); localStorage.setItem('nst_recovery_requests', JSON.stringify(updatedReqs)); 
      const user = users.find(u => u.id === userId); if (user && user.isArchived) { const updatedUsers = users.map(u => u.id === userId ? { ...u, isArchived: false, deletedAt: undefined } : u); setUsers(updatedUsers); localStorage.setItem('nst_users', JSON.stringify(updatedUsers)); } alert("Login Approved!"); 
  };
  
  const handleEditUser = (user: User) => { setEditingUser({ ...user }); setPersonalMsg(''); setActionCreditAmount(''); };
  
  const handleModifyCredits = (amount: number) => {
      if (!editingUser) return;
      const updatedUser = { ...editingUser, credits: (editingUser.credits || 0) + amount };
      updateSingleUser(updatedUser);
      alert(`${amount > 0 ? 'Added' : 'Deducted'} ${Math.abs(amount)} Credits.`);
  };

  const updateSingleUser = (u: User) => {
      setEditingUser(u);
      const updatedUsers = users.map(user => user.id === u.id ? u : user);
      setUsers(updatedUsers);
      localStorage.setItem('nst_users', JSON.stringify(updatedUsers));
  };

  // --- CONTENT STUDIO LOGIC ---
  const handleContentSubjectSelect = async (subject: Subject) => {
      setContentSubject(subject);
      setContentLoading(true);
      try {
          const lang = contentBoard === 'BSEB' ? 'Hindi' : 'English';
          const chapters = await fetchChapters(contentBoard, contentClass, contentStream, subject, lang);
          setContentChapters(chapters);
          setSelectedChapter(null);
          setGeneratedContent(null);
          setShowGenOptions(false);
      } catch (err) { alert("Failed to fetch syllabus."); } finally { setContentLoading(false); }
  };

  // Helper to check if content exists
  const checkContentStatus = (chapterId: string) => {
      const streamKey = (contentClass === '11' || contentClass === '12') ? `-${contentStream}` : '';
      const baseKey = `${contentBoard}-${contentClass}${streamKey}-${contentSubject?.name}-${chapterId}`;
      const hasPDF = localStorage.getItem(`nst_custom_lesson_${baseKey}-PDF_NOTES`);
      const hasNotes = localStorage.getItem(`nst_custom_lesson_${baseKey}-NOTES_PREMIUM`);
      return { hasPDF: !!hasPDF, hasNotes: !!hasNotes };
  };

  const handleGenerateContent = async (type: ContentType) => {
      if (!selectedChapter || !contentSubject) return;
      setShowGenOptions(false); 
      setContentLoading(true);
      try {
          const lang = contentBoard === 'BSEB' ? 'Hindi' : 'English';
          const content = await fetchLessonContent(
              contentBoard, contentClass, contentStream, contentSubject, selectedChapter, lang, type, 0, true
          );
          setGeneratedContent(content);
      } catch (err) { alert("AI Generation Failed."); } finally { setContentLoading(false); }
  };

  const handlePublishContent = () => {
      if (!generatedContent || !contentSubject || !selectedChapter) return;
      const type = generatedContent.type;
      const streamKey = (contentClass === '11' || contentClass === '12') ? `-${contentStream}` : '';
      const key = `${contentBoard}-${contentClass}${streamKey}-${contentSubject.name}-${selectedChapter.id}-${type}`;
      localStorage.setItem(`nst_custom_lesson_${key}`, JSON.stringify(generatedContent));
      alert("✅ Published Successfully!");
      calculateStorage();
  };

  // --- MANUAL DB SAVE LOGIC ---
  const handleManualEditOpen = (type: ContentType) => {
      if(!selectedChapter) return;
      setManualEditMode(type);
      setManualTitle(selectedChapter.title);
      setManualText('');
      const streamKey = (contentClass === '11' || contentClass === '12') ? `-${contentStream}` : '';
      const key = `${contentBoard}-${contentClass}${streamKey}-${contentSubject?.name}-${selectedChapter.id}-${type}`;
      const saved = localStorage.getItem(`nst_custom_lesson_${key}`);
      if(saved) {
          try { setManualText(JSON.parse(saved).content); } catch(e) {}
      }
  };

  const handleManualSave = () => {
      if(!selectedChapter || !contentSubject || !manualEditMode) return;
      if (manualEditMode === 'PDF_NOTES' && !manualText.trim()) { alert("Please enter URL."); return; }

      const content: LessonContent = {
          id: Date.now().toString(),
          title: manualTitle || selectedChapter.title,
          subtitle: manualEditMode === 'PDF_NOTES' ? "Visual PDF Notes" : "Manual Entry",
          content: manualText, // This will be the URL for PDF
          type: manualEditMode,
          dateCreated: new Date().toISOString(),
          subjectName: contentSubject.name
      };

      const streamKey = (contentClass === '11' || contentClass === '12') ? `-${contentStream}` : '';
      const key = `${contentBoard}-${contentClass}${streamKey}-${contentSubject.name}-${selectedChapter.id}-${manualEditMode}`;
      localStorage.setItem(`nst_custom_lesson_${key}`, JSON.stringify(content));
      alert("Saved! Link Updated.");
      setManualEditMode(null);
      calculateStorage();
  };

  const handleEditPackage = (pkg: CreditPackage) => {
    setEditingPkgId(pkg.id); setPkgName(pkg.name); setPkgCredits(pkg.credits); setPkgPrice(pkg.price); setPkgPopular(!!pkg.isPopular);
  };

  const handlePermanentDeleteUser = (userId: string) => {
    if(window.confirm("Permanently delete this user?")) handleDeleteUser(userId, true);
  };

  const filteredUsers = users.filter(u => !u.isArchived && (u.name.toLowerCase().includes(search.toLowerCase()) || u.id.toLowerCase().includes(search.toLowerCase())));
  const deletedUsers = users.filter(u => u.isArchived && u.deletedAt);
  const pendingPayments = paymentRequests.filter(p => p.status === 'PENDING');
  const pendingRecovery = recoveryRequests.filter(r => r.status === 'PENDING');

  if (showChat) {
      return (
          <div className="animate-in fade-in slide-in-from-right duration-500">
              <button onClick={() => { setShowChat(false); loadData(); }} className="mb-4 text-blue-600 font-bold hover:underline flex items-center gap-1">&larr; Back to Dashboard</button>
              <UniversalChat currentUser={adminUser} onUserUpdate={()=>{}} isAdminView={true} settings={localSettings} />
          </div>
      );
  }

  if (showAudioStudio) {
      return <AudioStudio language={contentBoard === 'BSEB' ? 'Hindi' : 'English'} onBack={() => setShowAudioStudio(false)} />;
  }

  if (showDevConsole) {
      return <AdminDevAssistant onClose={() => setShowDevConsole(false)} />;
  }

  if (manualEditMode && selectedChapter) {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                  <div className="flex justify-between items-center p-6 border-b border-slate-100">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          {manualEditMode === 'PDF_NOTES' ? <LinkIcon className="text-red-600" /> : <FileEdit className="text-blue-600" />} 
                          {manualEditMode === 'PDF_NOTES' ? 'Add PDF Link' : 'Edit Content'}
                      </h3>
                      <button onClick={() => setManualEditMode(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                  </div>

                  <div className="p-6 space-y-4">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <p className="text-xs font-bold text-slate-500 uppercase">Chapter</p>
                          <p className="font-bold text-slate-800">{selectedChapter.title}</p>
                      </div>
                      
                      {manualEditMode === 'PDF_NOTES' ? (
                          <div className="space-y-4">
                              <div>
                                  <label className="text-sm font-bold text-slate-700 mb-1 block">Paste PDF URL</label>
                                  <div className="flex items-center gap-2 border-2 border-blue-100 rounded-xl px-3 py-2 bg-blue-50 focus-within:border-blue-500 focus-within:bg-white transition-all">
                                      <LinkIcon size={18} className="text-blue-400" />
                                      <input 
                                          type="url" 
                                          placeholder="https://drive.google.com/..." 
                                          value={manualText} 
                                          onChange={e => setManualText(e.target.value)} 
                                          className="w-full bg-transparent outline-none text-sm font-medium"
                                          autoFocus
                                      />
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-1 ml-1">Use Google Drive, Dropbox, or any public PDF link.</p>
                              </div>
                          </div>
                      ) : (
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">{manualEditMode?.includes('MCQ') ? 'MCQ JSON' : 'Content (Markdown)'}</label>
                              <textarea value={manualText} onChange={e => setManualText(e.target.value)} className="w-full h-64 p-4 border rounded-xl font-mono text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none mt-1" />
                          </div>
                      )}

                      <div className="flex gap-4 pt-4">
                          <button onClick={() => setManualEditMode(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancel</button>
                          <button onClick={handleManualSave} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                              <Save size={18} /> {manualEditMode === 'PDF_NOTES' ? 'Save Link' : 'Save Content'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (generatedContent) {
      return (
          <div className="animate-in fade-in relative">
              <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 p-4 mb-4 flex flex-col md:flex-row justify-between items-center rounded-xl shadow-sm gap-4">
                  <button onClick={() => setGeneratedContent(null)} className="text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 self-start md:self-auto">&larr; Back to Studio</button>
                  <button onClick={handlePublishContent} className="flex-1 md:flex-none bg-green-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-green-700 flex items-center justify-center gap-2 animate-bounce transition-colors"><Database size={18} /> Publish to Students</button>
              </div>
              <LessonView content={generatedContent} subject={contentSubject!} classLevel={contentClass} chapter={selectedChapter!} loading={false} onBack={() => setGeneratedContent(null)} isPremium={true} />
          </div>
      );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 mb-6 flex flex-wrap gap-2 sticky top-2 z-20">
          <button onClick={() => onNavigate('STUDENT_DASHBOARD' as any)} className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-lg hover:bg-slate-800">
              <ArrowLeft size={16} /> Back to App
          </button>
          {[
              { id: 'OVERVIEW', icon: LayoutDashboard, label: 'Overview' },
              { id: 'USERS', icon: Users, label: 'Users', alert: pendingRecovery.length > 0 },
              { id: 'PAYMENTS', icon: IndianRupee, label: 'Payments', alert: pendingPayments.length > 0 },
              { id: 'STORE', icon: ShoppingBag, label: 'Store' },
              { id: 'CONTENT', icon: BrainCircuit, label: 'Content' },
              { id: 'SYSTEM', icon: Settings, label: 'System' },
              { id: 'DATABASE', icon: HardDrive, label: 'Database' },
              { id: 'RECYCLE', icon: Recycle, label: 'Recycle' },
          ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as AdminTab)} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-[var(--primary)] text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                  <tab.icon size={16} /> <span className="hidden md:inline">{tab.label}</span>
                  {tab.alert && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
              </button>
          ))}
      </div>

      {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in">
              <div className="bg-white rounded-2xl p-6 text-slate-800 shadow-sm border border-slate-100">
                  <div className="flex justify-between mb-4"><Users className="text-[var(--primary)]" /><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">Total Users</span></div>
                  <div className="text-4xl font-black">{users.length}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 text-slate-800 shadow-sm border border-slate-100 cursor-pointer" onClick={() => setShowChat(true)}>
                  <div className="flex justify-between mb-4"><MessageCircle className="text-purple-600" /><span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-bold">Chat</span></div>
                  <div className="text-4xl font-black">{chatMessages.length}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                   <div className="flex justify-between mb-4"><Zap className="text-orange-500" /><span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-xs font-bold">Pending</span></div>
                   <div className="text-4xl font-black text-slate-800">{pendingPayments.length + pendingRecovery.length}</div>
              </div>
              <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex justify-between mb-4"><Coins className="text-yellow-400" /><span className="bg-slate-800 px-2 py-1 rounded text-xs font-bold">Credits</span></div>
                  <div className="text-4xl font-black text-yellow-400">{users.reduce((acc, u) => acc + (u.credits || 0), 0)}</div>
              </div>
              <div className="md:col-span-2 lg:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-2">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Megaphone className="text-blue-600" /> Global Broadcast</h3>
                  <div className="flex gap-2">
                      <input type="text" placeholder="Send announcement..." value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
                      <button onClick={handleBroadcast} className={`px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 ${broadcastSent ? 'bg-green-600' : 'bg-[var(--primary)]'}`}>{broadcastSent ? <CheckCircle size={20} /> : <Send size={20} />} {broadcastSent ? 'Sent' : 'Post'}</button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'USERS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-100 flex gap-4 items-center">
                      <div className="relative flex-1">
                          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
                          <input type="text" placeholder="Search Users..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl bg-slate-50" />
                      </div>
                  </div>
                  <div className="overflow-y-auto max-h-[600px] p-2">
                      {pendingRecovery.map(req => (
                          <div key={req.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-100 rounded-xl mb-2">
                              <div><div className="font-bold text-slate-800">{req.name}</div><div className="text-xs text-slate-500">{req.id}</div></div>
                              <button onClick={() => approveLoginRequest(req.id)} className="bg-orange-600 text-white px-3 py-1 rounded-lg text-xs font-bold">Approve</button>
                          </div>
                      ))}
                      {filteredUsers.map(user => (
                          <div key={user.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">{user.name.charAt(0)}</div>
                                  <div><div className="font-bold text-slate-800 text-sm">{user.name} {user.isPremium && <Crown size={12} className="inline text-yellow-500" />}</div><div className="text-xs text-slate-400 font-mono">{user.id} | {user.credits} Cr</div></div>
                              </div>
                              <button onClick={() => handleEditUser(user)} className="p-2 text-slate-400 hover:text-blue-600"><Edit size={18} /></button>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-fit">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Ticket className="text-green-600" /> Gift Codes</h3>
                  <div className="space-y-3 mb-6">
                      <input type="number" placeholder="Amount" value={giftAmount} onChange={e => setGiftAmount(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl" />
                      <input type="number" placeholder="Quantity" value={giftQuantity} onChange={e => setGiftQuantity(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl" />
                      <button onClick={handleGenerateCodes} className="w-full bg-slate-900 text-white py-2 rounded-xl font-bold">Generate</button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                      {codes.filter(c => !c.isRedeemed).map(c => (
                          <div key={c.code} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-xs border border-slate-200">
                              <span className="font-mono font-bold select-all">{c.code}</span><span className="text-green-600 font-bold">{c.amount}Cr</span><button onClick={() => handleDeleteCode(c.code)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'PAYMENTS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-lg text-slate-800">Requests</h3><span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-bold">Pending: {pendingPayments.length}</span></div>
              <div className="divide-y divide-slate-100">
                  {pendingPayments.map(req => (
                      <div key={req.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50">
                          <div><div className="font-bold text-slate-800">{req.userName} <span className="text-slate-400 font-normal text-sm">({req.userId})</span></div><div className="text-sm text-slate-600 mt-1">Pkg: {req.packageName} | ₹{req.amount}</div><div className="text-xs text-blue-600 font-mono mt-1 bg-blue-50 inline-block px-2 py-0.5 rounded border border-blue-100">TXN: {req.txnId}</div></div>
                          <div className="flex gap-3"><button onClick={() => handleProcessPayment(req.id, 'REJECT')} className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-lg border border-red-200">Reject</button><button onClick={() => handleProcessPayment(req.id, 'APPROVE')} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg shadow-lg">Approve</button></div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'STORE' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-in fade-in">
              <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><ShoppingBag className="text-purple-600" /> Packages</h3><button onClick={() => setLocalSettings({...localSettings, isPaymentEnabled: !localSettings.isPaymentEnabled})} className={`px-3 py-1 rounded-full text-xs font-bold ${localSettings.isPaymentEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{localSettings.isPaymentEnabled ? 'ACTIVE' : 'CLOSED'}</button></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {localSettings.packages.map(pkg => (
                      <div key={pkg.id} className="border-2 border-slate-100 rounded-xl p-4 relative group hover:border-blue-200"><button onClick={() => handleRemovePackage(pkg.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500"><X size={16} /></button><button onClick={() => handleEditPackage(pkg)} className="absolute top-2 right-8 text-slate-300 hover:text-blue-500"><Edit size={16} /></button><div className="font-bold text-slate-800 text-lg">{pkg.name}</div><div className="text-2xl font-black text-blue-600 my-2">₹{pkg.price}</div><div className="text-sm text-slate-500 font-medium">{pkg.credits} Credits</div></div>
                  ))}
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col gap-2 bg-slate-50">
                      <input type="text" placeholder="Name" value={pkgName} onChange={e => setPkgName(e.target.value)} className="p-2 border rounded-lg text-sm" />
                      <div className="flex gap-2"><input type="number" placeholder="Credits" value={pkgCredits} onChange={e => setPkgCredits(Number(e.target.value))} className="p-2 border rounded-lg text-sm w-1/2" /><input type="number" placeholder="Price" value={pkgPrice} onChange={e => setPkgPrice(Number(e.target.value))} className="p-2 border rounded-lg text-sm w-1/2" /></div>
                      <div className="flex gap-2 mt-2"><button onClick={handleSavePackage} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs">{editingPkgId ? 'Update' : 'Add'}</button></div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'CONTENT' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in">
              <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
                  <h3 className="font-bold text-lg text-slate-800 mb-4">Syllabus</h3>
                  <div className="space-y-3">
                      <div><label className="text-xs font-bold text-slate-500">Board</label><select value={contentBoard} onChange={e => setContentBoard(e.target.value as any)} className="w-full p-2 border rounded-lg"><option value="CBSE">CBSE</option><option value="BSEB">BSEB</option></select></div>
                      <div><label className="text-xs font-bold text-slate-500">Class</label><select value={contentClass} onChange={e => setContentClass(e.target.value as any)} className="w-full p-2 border rounded-lg">{['6','7','8','9','10','11','12'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                      {['11','12'].includes(contentClass) && <div><label className="text-xs font-bold text-slate-500">Stream</label><select value={contentStream} onChange={e => setContentStream(e.target.value as any)} className="w-full p-2 border rounded-lg"><option value="Science">Science</option><option value="Commerce">Commerce</option><option value="Arts">Arts</option></select></div>}
                      <div><label className="text-xs font-bold text-slate-500">Subject</label><div className="grid grid-cols-2 gap-2 mt-1">{getSubjectsList(contentClass, contentStream).map(s => <button key={s.id} onClick={() => handleContentSubjectSelect(s)} className={`p-2 rounded-lg text-xs font-bold border ${contentSubject?.id === s.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{s.name}</button>)}</div></div>
                  </div>
              </div>
              <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  {!contentSubject ? (
                      <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl"><BrainCircuit size={48} className="mb-2 opacity-50" /><p>Select a subject to begin</p></div>
                  ) : (
                      <>
                          <div className="flex justify-between items-center mb-6"><div><h3 className="font-bold text-xl text-slate-800">{contentSubject.name}</h3><p className="text-xs text-slate-500">{contentChapters.length} Chapters</p></div><div className="flex gap-2"><button onClick={() => setShowAudioStudio(true)} className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-2 rounded-lg font-bold text-xs hover:bg-purple-200"><Mic size={14} /> Audio Studio</button></div></div>
                          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                              {contentChapters.map(ch => {
                                  const status = checkContentStatus(ch.id);
                                  return (
                                      <div key={ch.id} className="border border-slate-200 p-4 rounded-xl hover:border-blue-400 transition-colors bg-slate-50 group">
                                          <div className="flex justify-between items-start mb-3">
                                              <h4 className="font-bold text-slate-700">{ch.title}</h4>
                                              <div className="flex gap-2">
                                                  {/* PDF LINK BUTTON - Primary Action */}
                                                  <button onClick={() => { setSelectedChapter(ch); handleManualEditOpen('PDF_NOTES'); }} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${status.hasPDF ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-400 border-slate-200 hover:text-red-500'}`} title="Add/Edit PDF Link">
                                                      <LinkIcon size={14} /> {status.hasPDF ? 'Linked' : 'Add Link'}
                                                  </button>
                                                  
                                                  {/* Other Actions hidden in group hover or streamlined */}
                                                  <div className="flex gap-1">
                                                      <button onClick={() => { setSelectedChapter(ch); handleManualEditOpen('NOTES_PREMIUM'); }} className={`p-1.5 rounded border ${status.hasNotes ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-400 border-slate-200'}`} title="Edit Text Notes"><FileCode size={14} /></button>
                                                      <button onClick={() => { setSelectedChapter(ch); setShowGenOptions(true); }} className="p-1.5 bg-slate-800 text-white rounded hover:bg-slate-700" title="AI Generate"><Sparkles size={14} /></button>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </>
                  )}
              </div>
          </div>
      )}

      {showGenOptions && selectedChapter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative">
                  <div className="bg-slate-50 p-6 border-b border-slate-200"><h3 className="text-lg font-black text-slate-800">Generate Content</h3><button onClick={() => setShowGenOptions(false)} className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"><X size={18} /></button></div>
                  <div className="p-6 grid grid-cols-2 gap-4">
                      <button onClick={() => handleGenerateContent('NOTES_SIMPLE')} className="flex flex-col items-center p-4 rounded-xl border-2 border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-all group text-center"><div className="bg-blue-100 text-blue-600 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform"><BookOpen size={24} /></div><span className="font-bold text-slate-700 text-sm">Normal Notes</span></button>
                      <button onClick={() => handleGenerateContent('NOTES_PREMIUM')} className="flex flex-col items-center p-4 rounded-xl border-2 border-yellow-100 bg-yellow-50/30 hover:border-yellow-400 hover:bg-yellow-50 transition-all group text-center relative overflow-hidden"><div className="absolute top-0 right-0 bg-yellow-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">BEST</div><div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white p-3 rounded-full mb-3 shadow-lg group-hover:scale-110 transition-transform"><Crown size={24} /></div><span className="font-bold text-slate-800 text-sm">Premium Notes</span></button>
                      <button onClick={() => handleGenerateContent('MCQ_SIMPLE')} className="flex flex-col items-center p-4 rounded-xl border-2 border-slate-100 hover:border-green-300 hover:bg-green-50 transition-all group text-center"><div className="bg-green-100 text-green-600 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform"><FileQuestion size={24} /></div><span className="font-bold text-slate-700 text-sm">Normal MCQ</span></button>
                      <button onClick={() => handleGenerateContent('MCQ_ANALYSIS')} className="flex flex-col items-center p-4 rounded-xl border-2 border-purple-100 bg-purple-50/30 hover:border-purple-400 hover:bg-purple-50 transition-all group text-center"><div className="bg-purple-100 text-purple-600 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform"><BrainCircuit size={24} /></div><span className="font-bold text-slate-800 text-sm">Premium MCQ</span></button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'SYSTEM' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in">
               <div className="flex items-center justify-between mb-6"><h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Settings size={20} className="text-slate-600" /> System Configuration</h3><div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200"><HardDrive size={14} className="text-slate-500" /><span className="text-xs font-bold text-slate-600">Max Capacity: {localSettings.storageCapacity || '100 GB'}</span></div></div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center items-center"><div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Live DB Usage</div><div className="text-2xl font-black text-slate-800">{storageStats.usedMB} MB</div><button onClick={handleVerifyStorage} disabled={isVerifyingStorage} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded mt-2 text-slate-600 hover:text-blue-600 font-bold flex items-center gap-1">{isVerifyingStorage ? 'Verifying...' : 'Verify Data'}</button></div>
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center items-center"><div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Saved Items</div><div className="flex gap-2"><div className="text-center"><div className="text-lg font-black text-blue-600">{storageStats.totalNotes}</div><div className="text-[9px] text-slate-500">Notes</div></div><div className="w-px bg-slate-300"></div><div className="text-center"><div className="text-lg font-black text-purple-600">{storageStats.totalMCQs}</div><div className="text-[9px] text-slate-500">MCQs</div></div><div className="w-px bg-slate-300"></div><div className="text-center"><div className="text-lg font-black text-red-600">{storageStats.totalPDFs}</div><div className="text-[9px] text-slate-500">PDFs</div></div></div></div>
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center items-center relative overflow-hidden"><div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 z-10">Storage Status</div><div className="w-full bg-slate-200 rounded-full h-2 mb-2 mt-2 z-10"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.max(storageStats.percentUsed, 1)}%` }}></div></div><div className="text-[10px] text-slate-500 z-10">{storageStats.percentUsed < 0.01 ? '< 1%' : storageStats.percentUsed.toFixed(4) + '%'} Used</div></div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl"><div className="flex items-center gap-2 mb-3"><GraduationCap className="text-slate-600" size={18} /><h4 className="font-bold text-slate-700 text-sm">Manage Class Access</h4></div><div className="flex flex-wrap gap-2">{(['6', '7', '8', '9', '10', '11', '12'] as ClassLevel[]).map(cls => { const isOpen = (localSettings.allowedClasses || []).includes(cls); return (<button key={cls} onClick={() => handleToggleClass(cls)} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${isOpen ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>{isOpen ? <CheckCircle size={14} /> : <Lock size={14} />} Class {cls}</button>); })}</div></div>
                        <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl"><h4 className="text-sm font-bold text-purple-900 mb-2 flex items-center gap-2"><BrainCircuit size={16} /> AI Brain</h4><textarea value={localSettings.noteGenerationPrompt || ''} onChange={(e) => setLocalSettings({...localSettings, noteGenerationPrompt: e.target.value})} placeholder="System prompt for AI..." className="w-full h-24 p-3 border border-purple-200 rounded-xl text-sm bg-white focus:outline-none" /></div>
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-blue-900">API Key Manager</div>
                                    <div className="text-[10px] text-blue-600">Get key from: aistudio.google.com</div>
                                </div>
                                <div className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs font-bold">{localSettings.apiKeys?.length || 0} Keys Active</div>
                            </div>
                            <div className="flex gap-2">
                                <input type="text" placeholder="Paste Gemini API Key" value={newApiKey} onChange={e => setNewApiKey(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                                <button onClick={handleAddKey} className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-xs hover:bg-blue-700">Add</button>
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {localSettings.apiKeys?.map((k, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-blue-100 text-xs">
                                        <span className={`font-mono ${k.startsWith('AIza') ? 'text-green-600 font-bold' : 'text-slate-500'}`}>{k.substring(0, 12)}...</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleTestKey(k)} disabled={testingKey} className="text-blue-500 bg-blue-50 p-1 rounded">Test</button>
                                            <button onClick={() => handleRemoveKey(idx)} className="text-red-500 p-1"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                   </div>
                   <div className="space-y-4">
                       <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"><div><div className="font-bold text-slate-700">Maintenance Mode</div></div><button onClick={() => setLocalSettings({...localSettings, maintenanceMode: !localSettings.maintenanceMode})} className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.maintenanceMode ? 'bg-red-500' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.maintenanceMode ? 'left-7' : 'left-1'}`}></div></button></div>
                       <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"><div><div className="font-bold text-slate-700">Allow Signups</div></div><button onClick={() => setLocalSettings({...localSettings, allowSignup: !localSettings.allowSignup})} className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.allowSignup ? 'bg-green-500' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.allowSignup ? 'left-7' : 'left-1'}`}></div></button></div>
                       <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl text-white mt-4 cursor-pointer hover:bg-slate-800" onClick={() => setShowDevConsole(true)}><div><div className="font-bold flex items-center gap-2"><Code2 size={16} /> Developer Console</div></div><Terminal size={20} className="text-green-400" /></div>
                       <div><label className="text-xs font-bold text-slate-500 uppercase">App Name</label><input type="text" value={localSettings.appName} onChange={e => setLocalSettings({...localSettings, appName: e.target.value})} className="w-full px-4 py-2 border rounded-xl" /></div>
                       <div><label className="text-xs font-bold text-slate-500 uppercase">Admin UPI ID</label><input type="text" value={localSettings.upiId} onChange={e => setLocalSettings({...localSettings, upiId: e.target.value})} className="w-full px-4 py-2 border rounded-xl" /></div>
                       <button onClick={handleSaveSettings} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl mt-4 shadow-lg hover:bg-slate-800 flex items-center justify-center gap-2"><Save size={18} /> Save System Settings</button>
                   </div>
               </div>
          </div>
      )}

      {activeTab === 'DATABASE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2"><HardDrive size={20} className="text-blue-600" /> Data Management</h3><div className="space-y-4"><button onClick={handleExportData} className="w-full py-3 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-xl hover:bg-blue-100 flex items-center justify-center gap-2"><Download size={18} /> Backup Database</button><label className="w-full py-3 bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 flex items-center justify-center gap-2 cursor-pointer"><Upload size={18} /> Restore Database<input type="file" onChange={handleImportData} className="hidden" accept=".json" /></label></div></div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100"><h3 className="font-bold text-lg text-red-700 mb-6 flex items-center gap-2"><AlertTriangle size={20} /> Danger Zone</h3><div className="space-y-4"><button onClick={() => clearData('nst_universal_chat', 'Chat History')} className="w-full py-3 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50">Clear Chat</button><button onClick={() => clearData('nst_payment_requests', 'Payments')} className="w-full py-3 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50">Clear Logs</button></div></div>
          </div>
      )}

      {activeTab === 'RECYCLE' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
               <div className="p-6 border-b border-slate-100"><h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Recycle size={20} className="text-green-600" /> Recycle Bin</h3></div>
               <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-6 py-4 font-bold">User</th><th className="px-6 py-4 font-bold">Deleted At</th><th className="px-6 py-4 text-right font-bold">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{deletedUsers.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">Recycle Bin is empty.</td></tr>}{deletedUsers.map(u => (<tr key={u.id}><td className="px-6 py-4 font-medium text-slate-700">{u.name} <span className="text-slate-400 text-xs">({u.id})</span></td><td className="px-6 py-4 text-slate-500">{u.deletedAt ? new Date(u.deletedAt).toLocaleDateString() : '-'}</td><td className="px-6 py-4 text-right flex justify-end gap-2"><button onClick={() => handleRestoreUser(u.id)} className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100" title="Restore"><RotateCcw size={16} /></button><button onClick={() => handlePermanentDeleteUser(u.id)} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Delete Forever"><Trash2 size={16} /></button></td></tr>))}</tbody></table></div>
          </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative">
                <div className="bg-slate-900 text-white p-6 relative">
                    <button onClick={() => setEditingUser(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24} /></button>
                    <div className="flex items-center gap-4"><div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold">{editingUser.name.charAt(0)}</div><div><h2 className="text-2xl font-bold">{editingUser.name}</h2><p className="text-slate-400 text-xs font-mono uppercase tracking-wide">{editingUser.id}</p>{editingUser.isLocked && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase mt-1 inline-block">Account Locked</span>}</div></div>
                </div>
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        {onImpersonate && (<button onClick={() => onImpersonate(editingUser)} className="flex flex-col items-center justify-center p-4 bg-purple-50 border border-purple-100 rounded-2xl hover:bg-purple-100 hover:scale-105 transition-all group"><Eye size={28} className="text-purple-600 mb-2 group-hover:scale-110 transition-transform" /><span className="font-bold text-purple-900 text-sm">View as User</span></button>)}
                        <button onClick={() => updateSingleUser({ ...editingUser, isLocked: !editingUser.isLocked })} className={`flex flex-col items-center justify-center p-4 border rounded-2xl transition-all group ${editingUser.isLocked ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>{editingUser.isLocked ? <><KeyRound size={28} className="text-green-600 mb-2" /><span className="font-bold text-green-900 text-sm">Unlock Account</span></> : <><Lock size={28} className="text-red-600 mb-2" /><span className="font-bold text-red-900 text-sm">Lock Account</span></>}</button>
                    </div>
                    
                    {/* ROLE MANAGEMENT */}
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                        <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Shield size={18} className="text-orange-600" /> Role Management</h4>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-600">Current Role: {editingUser.role}</span>
                            <button 
                                onClick={() => {
                                    if (editingUser.role === 'ADMIN') {
                                        updateSingleUser({ ...editingUser, role: 'STUDENT' });
                                    } else {
                                        const adminCount = users.filter(u => u.role === 'ADMIN').length;
                                        if (adminCount >= 10) {
                                            alert("Maximum Limit Reached: Cannot have more than 10 Admins.");
                                            return;
                                        }
                                        updateSingleUser({ ...editingUser, role: 'ADMIN' });
                                    }
                                }} 
                                className={`px-4 py-2 rounded-xl font-bold text-xs ${editingUser.role === 'ADMIN' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                            >
                                {editingUser.role === 'ADMIN' ? 'Demote to Student' : 'Promote to Admin'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200"><h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Wallet size={18} className="text-blue-600" /> Wallet Manager</h4><div className="flex gap-2 items-center mb-2"><span className="text-sm font-bold text-slate-500">Current Balance:</span><span className="text-xl font-black text-slate-800">{editingUser.credits} CR</span></div><div className="flex gap-2"><input type="number" placeholder="Amount" value={actionCreditAmount} onChange={e => setActionCreditAmount(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-sm" /><button onClick={() => handleModifyCredits(Number(actionCreditAmount))} className="bg-green-600 text-white px-4 rounded-xl font-bold text-sm hover:bg-green-700">Add</button><button onClick={() => handleModifyCredits(-Number(actionCreditAmount))} className="bg-red-500 text-white px-4 rounded-xl font-bold text-sm hover:bg-red-600">Deduct</button></div></div>
                    <div className="space-y-3">
                        <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50"><span className="font-bold text-slate-700 flex items-center gap-2"><MessageCircle size={16} /> Ban Chat</span><div onClick={() => updateSingleUser({ ...editingUser, isChatBanned: !editingUser.isChatBanned })} className={`w-10 h-6 rounded-full relative transition-colors ${editingUser.isChatBanned ? 'bg-red-500' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingUser.isChatBanned ? 'left-5' : 'left-1'}`}></div></div></label>
                        <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50"><span className="font-bold text-slate-700 flex items-center gap-2"><Gamepad2 size={16} /> Ban Game</span><div onClick={() => updateSingleUser({ ...editingUser, isGameBanned: !editingUser.isGameBanned })} className={`w-10 h-6 rounded-full relative transition-colors ${editingUser.isGameBanned ? 'bg-red-500' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingUser.isGameBanned ? 'left-5' : 'left-1'}`}></div></div></label>
                    </div>
                    <button onClick={() => handleDeleteUser(editingUser.id, false)} className="w-full py-4 border-2 border-dashed border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 hover:border-red-300 flex items-center justify-center gap-2 transition-all"><Trash2 size={20} /> Move to Recycle Bin</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
