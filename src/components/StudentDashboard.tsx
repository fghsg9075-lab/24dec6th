
import React, { useState, useEffect } from 'react';
import { User, Subject, StudentTab, Chapter, SubjectProgress, ClassLevel, Board, Stream, SystemSettings, PaymentRequest, InboxMessage } from '../types';
import { getSubjectsList } from '../constants';
import { RedeemSection } from './RedeemSection';
import { Zap, Crown, Calendar, Clock, History, Layout, Gift, Sparkles, Megaphone, Lock, BookOpen, AlertCircle, Edit, Settings, Play, Pause, RotateCcw, MessageCircle, Gamepad2, Timer, CreditCard, Send, CheckCircle, Mail, X, Ban, Smartphone, Shield } from 'lucide-react';
import { SubjectSelection } from './SubjectSelection';
import { HistoryPage } from './HistoryPage';
import { fetchChapters } from '../services/gemini';
import { UniversalChat } from './UniversalChat';
import { SpinWheel } from './SpinWheel';

interface Props {
  user: User;
  dailyStudySeconds: number; // Received from Global App
  onSubjectSelect: (subject: Subject) => void;
  onRedeemSuccess: (user: User) => void;
  settings?: SystemSettings; // New prop
  onOpenAdminTools?: () => void; // New prop for admin
}

export const StudentDashboard: React.FC<Props> = ({ user, dailyStudySeconds, onSubjectSelect, onRedeemSuccess, settings, onOpenAdminTools }) => {
  const [activeTab, setActiveTab] = useState<StudentTab>('ROUTINE');
  const globalMessage = localStorage.getItem('nst_global_message');
  
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
      classLevel: user.classLevel || '10',
      board: user.board || 'CBSE',
      stream: user.stream || 'Science',
      newPassword: '' // Field for new password
  });

  const [canClaimReward, setCanClaimReward] = useState(false);
  const DAILY_TARGET = 3 * 3600; // 3 Hours in Seconds
  const REWARD_AMOUNT = settings?.dailyReward || 3;

  // Payment State
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [txnId, setTxnId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'IDLE'|'SUBMITTED'>('IDLE');

  // Inbox
  const [showInbox, setShowInbox] = useState(false);
  const unreadCount = user.inbox?.filter(m => !m.read).length || 0;

  // CONSTANTS FOR PAYMENT
  const ADMIN_PHONE = "8227070298";

  useEffect(() => {
    // Check if reward already claimed today
    const today = new Date().toDateString();
    const lastClaim = user.lastRewardClaimDate ? new Date(user.lastRewardClaimDate).toDateString() : '';
    setCanClaimReward(lastClaim !== today && dailyStudySeconds >= DAILY_TARGET);
  }, [user.lastRewardClaimDate, dailyStudySeconds]);

  const claimDailyReward = () => {
      if (!canClaimReward) return;
      const updatedUser = {
          ...user,
          credits: (user.credits || 0) + REWARD_AMOUNT,
          lastRewardClaimDate: new Date().toISOString()
      };
      const storedUsers = JSON.parse(localStorage.getItem('nst_users') || '[]');
      const userIdx = storedUsers.findIndex((u:User) => u.id === updatedUser.id);
      if (userIdx !== -1) {
          storedUsers[userIdx] = updatedUser;
          localStorage.setItem('nst_users', JSON.stringify(storedUsers));
          localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
      }
      setCanClaimReward(false);
      onRedeemSuccess(updatedUser);
      alert(`🎉 Congratulations! You studied for 3 Hours.\n\nReceived: ${REWARD_AMOUNT} Free Credits!`);
  };

  const handleWhatsAppPayment = () => {
      if (!selectedPackage || !settings) return;
      const pkg = settings.packages?.find(p => p.id === selectedPackage);
      if (!pkg) return;
      const message = `Hello Admin, I want to buy credits.\n\n📦 Package: ${pkg.name}\n💰 Amount: ₹${pkg.price}\n💎 Credits: ${pkg.credits}\n🆔 Student ID: ${user.id}\n\nPlease approve my request after payment.`;
      const url = `https://wa.me/91${ADMIN_PHONE}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  const handleSubmitPayment = () => {
      if (!selectedPackage || !txnId || !settings) return;
      const pkg = settings.packages?.find(p => p.id === selectedPackage);
      if (!pkg) return;
      const newRequest: PaymentRequest = {
          id: Date.now().toString(),
          userId: user.id,
          userName: user.name,
          packageId: pkg.id,
          packageName: pkg.name,
          amount: pkg.credits,
          txnId: txnId,
          status: 'PENDING',
          timestamp: new Date().toISOString()
      };
      const storedRequests = JSON.parse(localStorage.getItem('nst_payment_requests') || '[]');
      localStorage.setItem('nst_payment_requests', JSON.stringify([newRequest, ...storedRequests]));
      setPaymentStatus('SUBMITTED');
      setTxnId('');
      alert("Payment Request Submitted! Admin will review and add credits.");
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const saveProfile = () => {
      const storedUsers = JSON.parse(localStorage.getItem('nst_users') || '[]');
      
      const updatedUser = { 
          ...user, 
          board: profileData.board,
          classLevel: profileData.classLevel,
          stream: profileData.stream,
          password: profileData.newPassword.trim() ? profileData.newPassword : user.password
      };

      const userIdx = storedUsers.findIndex((u:User) => u.id === user.id);
      if(userIdx !== -1) {
          storedUsers[userIdx] = updatedUser;
          localStorage.setItem('nst_users', JSON.stringify(storedUsers));
          localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
          window.location.reload(); 
      }
      setEditMode(false);
  };
  
  const handleUserUpdate = (updatedUser: User) => {
      const storedUsers = JSON.parse(localStorage.getItem('nst_users') || '[]');
      const userIdx = storedUsers.findIndex((u:User) => u.id === updatedUser.id);
      if (userIdx !== -1) {
          storedUsers[userIdx] = updatedUser;
          localStorage.setItem('nst_users', JSON.stringify(storedUsers));
          localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
          onRedeemSuccess(updatedUser); 
      }
  };

  const markInboxRead = () => {
      if (!user.inbox) return;
      const updatedInbox = user.inbox.map(m => ({ ...m, read: true }));
      handleUserUpdate({ ...user, inbox: updatedInbox });
  };

  const RoutineView = () => {
    const subjects = getSubjectsList(user.classLevel || '10', user.stream || null);
    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="text-[var(--primary)]" /> Routine
                    </h3>
                    <p className="text-xs text-slate-500">Tap a subject to start learning</p>
                </div>
                <div className="flex gap-2">
                    {user.role === 'ADMIN' && (
                        <button 
                            onClick={onOpenAdminTools}
                            className="text-xs font-bold text-white bg-slate-900 px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-slate-800 shadow-md animate-pulse"
                        >
                            <Shield size={14} /> Admin Panel
                        </button>
                    )}
                    <button 
                        onClick={() => setEditMode(true)}
                        className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-slate-200 border border-slate-200"
                    >
                        <Settings size={14} /> Class & Profile
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-5 text-white mb-8 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between relative z-10">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                             <Timer size={14} /> Study Timer (Global)
                        </div>
                        <div className="text-4xl font-mono font-bold tracking-wider text-green-400">
                            {formatTime(dailyStudySeconds)}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Target: 3 Hours/Day for {REWARD_AMOUNT} Credits</p>
                    </div>
                    <div className="flex gap-2">
                         <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center animate-pulse">
                             <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                         </div>
                    </div>
                </div>
                <div className="mt-4 relative z-10">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                        <span>Progress</span>
                        <span>{Math.floor((Math.min(dailyStudySeconds, DAILY_TARGET) / DAILY_TARGET) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-green-400 transition-all duration-1000" style={{ width: `${Math.min((dailyStudySeconds / DAILY_TARGET) * 100, 100)}%` }}></div>
                    </div>
                </div>
                {canClaimReward && (
                    <button onClick={claimDailyReward} className="mt-4 w-full py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 font-bold rounded-lg shadow-lg animate-pulse text-xs flex items-center justify-center gap-2">
                        <Crown size={14} /> CLAIM {REWARD_AMOUNT} CREDITS REWARD
                    </button>
                )}
            </div>
            
            <div className="space-y-3">
                {subjects.map((subj, idx) => {
                    const progress = user.progress?.[subj.id] || { currentChapterIndex: 0, totalMCQsSolved: 0 };
                    const startHour = 8 + idx; 
                    const timeSlot = `${startHour}:00 - ${startHour + 1}:00`;
                    return (
                        <div key={idx} onClick={() => onSubjectSelect(subj)} className="p-4 rounded-xl border bg-white border-slate-200 hover:border-[var(--primary)] hover:shadow-md flex items-center gap-4 transition-all cursor-pointer group relative overflow-hidden">
                            <div className="w-16 text-center opacity-60"><div className="font-bold text-slate-800">{timeSlot.split('-')[0]}</div></div>
                            <div className={`h-10 w-1 ${subj.color.split(' ')[0]} rounded-full`}></div>
                            <div className="flex-1">
                                <h4 className="font-bold text-lg text-slate-800">{subj.name}</h4>
                                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                                    <span className="flex items-center gap-1"><BookOpen size={12} /> Ch: {progress.currentChapterIndex + 1}</span>
                                    <span className={`flex items-center gap-1 font-bold ${progress.totalMCQsSolved < 100 ? 'text-orange-500' : 'text-green-600'}`}>MCQs: {progress.totalMCQsSolved}/100</span>
                                </div>
                            </div>
                            <div className="p-2 bg-slate-50 rounded-full group-hover:bg-[var(--primary)] text-slate-300 group-hover:text-white transition-colors"><Clock size={20} /></div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  const isGameEnabled = settings?.isGameEnabled ?? true;

  return (
    <div>
        {/* Profile Edit Modal */}
        {editMode && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                    <h3 className="font-bold text-lg mb-4">Edit Profile & Settings</h3>
                    <div className="space-y-3 mb-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">New Password</label>
                            <input 
                                type="text" 
                                placeholder="Set new password (optional)" 
                                value={profileData.newPassword}
                                onChange={e => setProfileData({...profileData, newPassword: e.target.value})}
                                className="w-full p-2 border rounded-lg bg-yellow-50 border-yellow-200"
                            />
                            <p className="text-[9px] text-slate-400 mt-1">Leave blank to keep current password.</p>
                        </div>
                        <div className="h-px bg-slate-100 my-2"></div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Board</label>
                            <select value={profileData.board} onChange={e => setProfileData({...profileData, board: e.target.value as any})} className="w-full p-2 border rounded-lg">
                                <option value="CBSE">CBSE</option>
                                <option value="BSEB">BSEB</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Class</label>
                            <select value={profileData.classLevel} onChange={e => setProfileData({...profileData, classLevel: e.target.value as any})} className="w-full p-2 border rounded-lg">
                                {['6','7','8','9','10','11','12'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        {['11','12'].includes(profileData.classLevel) && (
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Stream</label>
                                <select value={profileData.stream} onChange={e => setProfileData({...profileData, stream: e.target.value as any})} className="w-full p-2 border rounded-lg">
                                    <option value="Science">Science</option>
                                    <option value="Commerce">Commerce</option>
                                    <option value="Arts">Arts</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setEditMode(false)} className="flex-1 py-2 text-slate-500 font-bold">Cancel</button>
                        <button onClick={saveProfile} className="flex-1 py-2 bg-[var(--primary)] text-white rounded-lg font-bold">Save Changes</button>
                    </div>
                </div>
            </div>
        )}

        {/* INBOX MODAL */}
        {showInbox && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Mail size={18} className="text-[var(--primary)]" /> Admin Messages</h3>
                        <button onClick={() => setShowInbox(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-4 space-y-3">
                        {(!user.inbox || user.inbox.length === 0) && (
                            <p className="text-slate-400 text-sm text-center py-8">No messages from Admin.</p>
                        )}
                        {user.inbox?.map(msg => (
                            <div key={msg.id} className={`p-3 rounded-xl border text-sm ${msg.read ? 'bg-white border-slate-100' : 'bg-blue-50 border-blue-100'}`}>
                                <p className="text-slate-700 leading-relaxed">{msg.text}</p>
                                <p className="text-[10px] text-slate-400 mt-2 text-right">{new Date(msg.date).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                    {unreadCount > 0 && (
                        <button onClick={markInboxRead} className="w-full py-3 bg-[var(--primary)] text-white font-bold text-sm hover:opacity-90">Mark All as Read</button>
                    )}
                </div>
            </div>
        )}

        {globalMessage && (
            <div className="bg-[var(--primary)] text-white p-3 rounded-xl mb-6 flex items-start gap-3 shadow-lg animate-pulse">
                <Megaphone size={20} className="shrink-0 mt-0.5" />
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Admin Announcement</p>
                    <p className="font-medium text-sm">{globalMessage}</p>
                </div>
            </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 mb-6 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-full text-orange-600"><Zap size={20} fill="currentColor" /></div>
                <div><h3 className="text-lg font-black text-slate-800">{user.streak} Days</h3><p className="text-[10px] text-slate-500 uppercase font-bold">Streak</p></div>
            </div>
            <div className="flex items-center gap-3 border-l border-slate-100 pl-4">
                <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Crown size={20} fill="currentColor" /></div>
                <div><h3 className="text-lg font-black text-slate-800">{user.credits} Cr</h3><p className="text-[10px] text-slate-500 uppercase font-bold">Credits</p></div>
            </div>
            <div className="relative cursor-pointer" onClick={() => setShowInbox(true)}>
                <div className="bg-slate-100 p-2 rounded-full text-slate-600 hover:bg-blue-50 hover:text-[var(--primary)] transition-colors"><Mail size={20} /></div>
                {unreadCount > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">{unreadCount}</div>}
            </div>
        </div>

        <div className={`grid ${isGameEnabled ? 'grid-cols-6' : 'grid-cols-5'} gap-1 bg-white p-2 rounded-xl border border-slate-200 shadow-sm mb-8 sticky top-20 z-20`}>
            <button onClick={() => setActiveTab('ROUTINE')} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${activeTab === 'ROUTINE' ? 'bg-slate-100 text-[var(--primary)]' : 'text-slate-400 hover:bg-slate-50'}`}><Calendar size={18} className="mb-1" /><span className="text-[9px] font-bold uppercase">Routine</span></button>
            <button onClick={() => setActiveTab('CHAT')} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${activeTab === 'CHAT' ? 'bg-slate-100 text-[var(--primary)]' : 'text-slate-400 hover:bg-slate-50'}`}><MessageCircle size={18} className="mb-1" /><span className="text-[9px] font-bold uppercase">Chat</span></button>
            {isGameEnabled && <button onClick={() => setActiveTab('GAME')} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${activeTab === 'GAME' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`}><Gamepad2 size={18} className="mb-1" /><span className="text-[9px] font-bold uppercase">Game</span></button>}
            <button onClick={() => setActiveTab('HISTORY')} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${activeTab === 'HISTORY' ? 'bg-slate-100 text-[var(--primary)]' : 'text-slate-400 hover:bg-slate-50'}`}><History size={18} className="mb-1" /><span className="text-[9px] font-bold uppercase">History</span></button>
            <button onClick={() => setActiveTab('REDEEM')} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${activeTab === 'REDEEM' ? 'bg-slate-100 text-[var(--primary)]' : 'text-slate-400 hover:bg-slate-50'}`}><Gift size={18} className="mb-1" /><span className="text-[9px] font-bold uppercase">Redeem</span></button>
            <button onClick={() => setActiveTab('PREMIUM')} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${activeTab === 'PREMIUM' ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><Sparkles size={18} className="mb-1" /><span className="text-[9px] font-bold uppercase">Premium</span></button>
        </div>

        <div className="min-h-[400px]">
            {activeTab === 'ROUTINE' && <RoutineView />}
            {activeTab === 'CHAT' && <UniversalChat currentUser={user} onUserUpdate={handleUserUpdate} settings={settings} />}
            {activeTab === 'GAME' && isGameEnabled && (user.isGameBanned ? <div className="text-center py-20 bg-red-50 rounded-2xl border border-red-100"><Ban size={48} className="mx-auto text-red-500 mb-4" /><h3 className="text-lg font-bold text-red-700">Access Denied</h3><p className="text-sm text-red-600">Admin has disabled the game for your account.</p></div> : <SpinWheel user={user} onUpdateUser={handleUserUpdate} />)}
            {activeTab === 'HISTORY' && <HistoryPage />}
            {activeTab === 'REDEEM' && <div className="animate-in fade-in slide-in-from-bottom-2 duration-300"><RedeemSection user={user} onSuccess={onRedeemSuccess} /></div>}
            {activeTab === 'PREMIUM' && <div className="animate-in zoom-in duration-300 pb-10"><div className="bg-slate-900 rounded-2xl p-6 text-center text-white mb-8"><h2 className="text-2xl font-bold mb-2">Buy Credits</h2><p className="text-slate-400 text-sm">Select a package, Pay via UPI, and submit request.</p></div>{settings?.isPaymentEnabled === false ? <div className="bg-gradient-to-br from-slate-100 to-slate-200 p-10 rounded-3xl border-2 border-slate-300 text-center shadow-inner"><div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"><Lock size={40} className="text-slate-400" /></div><h3 className="text-2xl font-black text-slate-700 mb-2">Store Locked</h3><p className="text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">{settings.paymentDisabledMessage || "Purchases are currently disabled by the Admin. Please check back later."}</p></div> : <><div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">{settings?.packages?.map(pkg => <div key={pkg.id} onClick={() => setSelectedPackage(pkg.id)} className={`bg-white p-6 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden group ${selectedPackage === pkg.id ? 'border-[var(--primary)] shadow-xl scale-105' : 'border-slate-200 hover:border-blue-400'}`}>{pkg.isPopular && <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 rounded-bl-lg">POPULAR</div>}<h3 className="text-xl font-bold text-slate-800">{pkg.name}</h3><div className="text-3xl font-black text-[var(--primary)] my-2">₹{pkg.price}</div><div className="font-bold text-slate-600">{pkg.credits} Credits</div></div>)}</div>{selectedPackage && <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg animate-in slide-in-from-bottom-4"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><CreditCard size={20} className="text-green-600" /> Complete Payment</h3><div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200 text-sm space-y-2"><p className="font-bold text-slate-700">Send Payment To:</p><p>UPI ID: <span className="font-mono bg-white px-2 py-1 rounded border">{settings?.upiId || `${ADMIN_PHONE}@paytm`}</span></p><p>Name: <span className="font-mono">{settings?.upiName || 'NST Admin'}</span></p></div><div className="space-y-3"><div className="mb-4"><button onClick={handleWhatsAppPayment} className="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 shadow-md flex items-center justify-center gap-2"><MessageCircle size={20} /> Order via WhatsApp</button></div><label className="text-xs font-bold text-slate-500 uppercase">Enter Transaction ID / UTR (After Payment)</label><input type="text" placeholder="e.g. 3456789012" value={txnId} onChange={e => setTxnId(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono" />{paymentStatus === 'SUBMITTED' ? <div className="bg-green-100 text-green-700 p-4 rounded-xl text-center font-bold flex items-center justify-center gap-2"><CheckCircle size={20} /> Request Sent! Wait for Admin.</div> : <button onClick={handleSubmitPayment} disabled={!txnId} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"><Send size={18} /> Submit Payment Request</button>}</div></div>}</>}</div>}
        </div>
    </div>
  );
};
