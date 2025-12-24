
import React, { useState, useEffect } from 'react';
import { 
  ClassLevel, Subject, Chapter, AppState, Board, Stream, User, ContentType, SystemSettings
} from './types';
import { fetchChapters, fetchLessonContent } from './services/gemini';
import { BoardSelection } from './components/BoardSelection';
import { ClassSelection } from './components/ClassSelection';
import { SubjectSelection } from './components/SubjectSelection';
import { ChapterSelection } from './components/ChapterSelection';
import { StreamSelection } from './components/StreamSelection';
import { LessonView } from './components/LessonView';
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { AudioStudio } from './components/AudioStudio';
import { WelcomePopup } from './components/WelcomePopup';
import { PremiumModal } from './components/PremiumModal';
import { LoadingOverlay } from './components/LoadingOverlay';
import { RulesPage } from './components/RulesPage';
import { IICPage } from './components/IICPage';
import { BrainCircuit, Globe, LogOut, LayoutDashboard, BookOpen, Headphones, HelpCircle, Newspaper, KeyRound, Lock, X, ShieldCheck, FileText, UserPlus, EyeOff } from 'lucide-react';
import { SUPPORT_EMAIL } from './constants';

const TermsPopup: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-lg md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-white p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <FileText className="text-[var(--primary)]" /> Terms & Conditions
                </h3>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-600 leading-relaxed custom-scrollbar">
                <p className="text-slate-900 font-medium">Please read carefully before using NST AI Assistant.</p>
                
                <div className="space-y-3">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <strong className="block text-slate-800 mb-1">1. Educational Use Only</strong>
                        This app uses AI to generate content. Always verify important information with your official textbooks.
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <strong className="block text-slate-800 mb-1">2. Data Privacy</strong>
                        Your progress and notes are stored locally on your device. We do not sell your personal data.
                    </div>
                     <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <strong className="block text-slate-800 mb-1">3. Premium Credits</strong>
                        Credits purchased are non-refundable. They are used to generate premium AI content.
                    </div>
                     <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <strong className="block text-slate-800 mb-1">4. User Conduct</strong>
                        Abusive behavior in the Universal Chat will result in an immediate and permanent ban.
                    </div>
                </div>

                <p className="text-xs text-slate-400 mt-4">By continuing, you agree to abide by these rules and the standard terms of service.</p>
            </div>
            <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0 z-10">
                <button 
                    onClick={onClose} 
                    className="w-full bg-[var(--primary)] hover:opacity-90 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95"
                >
                    I Agree & Continue
                </button>
            </div>
        </div>
    </div>
);

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    user: null,
    originalAdmin: null,
    view: 'BOARDS',
    selectedBoard: null,
    selectedClass: null,
    selectedStream: null,
    selectedSubject: null,
    selectedChapter: null,
    chapters: [],
    lessonContent: null,
    loading: false,
    error: null,
    language: 'English',
    showWelcome: false,
    globalMessage: null,
    settings: {
        appName: 'NST',
        themeColor: '#3b82f6', // Default Blue
        maintenanceMode: false,
        customCSS: '',
        apiKeys: [], // Multi Key Support
        chatCost: 1,
        dailyReward: 3,
        signupBonus: 2,
        isChatEnabled: true,
        isGameEnabled: true, 
        allowSignup: true,
        loginMessage: '',
        allowedClasses: ['6','7','8','9','10','11','12'], // Default ALL OPEN
        storageCapacity: '100 GB', // DEFAULT STORAGE
        isPaymentEnabled: true, 
        paymentDisabledMessage: 'Store is currently closed. Please check back later.',
        upiId: '8227070298@paytm',
        upiName: 'NST Admin',
        qrCodeUrl: '',
        paymentInstructions: 'Scan QR or Pay to UPI ID. Then enter the Transaction ID below for verification.',
        packages: [
            { id: 'p1', name: 'Starter Pack', credits: 50, price: 29, isPopular: false },
            { id: 'p2', name: 'Value Pack', credits: 200, price: 99, isPopular: true },
            { id: 'p3', name: 'Pro Pack', credits: 500, price: 199, isPopular: false }
        ]
    }
  });

  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [tempSelectedChapter, setTempSelectedChapter] = useState<Chapter | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  
  // New State for Precision Loading
  const [generationDataReady, setGenerationDataReady] = useState(false);

  // GLOBAL STUDY TIMER
  const [dailyStudySeconds, setDailyStudySeconds] = useState(0);

  // LOAD SETTINGS
  useEffect(() => {
      const storedSettings = localStorage.getItem('nst_system_settings');
      if (storedSettings) {
          try {
              const parsed = JSON.parse(storedSettings);
              setState(prev => ({ 
                  ...prev, 
                  settings: {
                      ...prev.settings,
                      ...parsed,
                      apiKeys: parsed.apiKeys || [], 
                      isPaymentEnabled: parsed.isPaymentEnabled ?? true,
                      isGameEnabled: parsed.isGameEnabled ?? true,
                      allowedClasses: parsed.allowedClasses || ['6','7','8','9','10','11','12'],
                      storageCapacity: parsed.storageCapacity || '100 GB',
                      themeColor: parsed.themeColor || '#3b82f6'
                  } 
              }));
          } catch(e) {}
      }
      
      const hasAcceptedTerms = localStorage.getItem('nst_terms_accepted');
      if (!hasAcceptedTerms) {
          setShowTerms(true);
      }

      const hasSeenWelcome = localStorage.getItem('nst_has_seen_welcome');
      if (!hasSeenWelcome && hasAcceptedTerms) setState(prev => ({ ...prev, showWelcome: true }));

      const loggedInUserStr = localStorage.getItem('nst_current_user');
      if (loggedInUserStr) {
        const user: User = JSON.parse(loggedInUserStr);
        if (!user.progress) user.progress = {};
        
        // Check for Locked Account
        if (user.isLocked) {
            localStorage.removeItem('nst_current_user');
            alert("This account has been Locked by Admin. Contact Support.");
            return;
        }

        // REDESIGN: ADMIN NOW GOES TO STUDENT DASHBOARD
        let initialView = 'STUDENT_DASHBOARD'; 
        // if (user.role === 'ADMIN') initialView = 'ADMIN_DASHBOARD'; // OLD LOGIC REMOVED
        
        const lang = user.board === 'BSEB' ? 'Hindi' : 'English';

        setState(prev => ({ 
          ...prev, 
          user: user,
          view: initialView as any,
          selectedBoard: user.board || null,
          selectedClass: user.classLevel || null,
          selectedStream: user.stream || null,
          language: lang,
          showWelcome: !hasSeenWelcome && !!hasAcceptedTerms
        }));
      }
  }, []);

  // APPLY DYNAMIC SETTINGS (Title & CSS Variables)
  useEffect(() => {
      document.title = `${state.settings.appName} - AI Learning Assistant`;
      
      const styleId = 'nst-custom-styles';
      let styleTag = document.getElementById(styleId);
      if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = styleId;
          document.head.appendChild(styleTag);
      }
      // Inject CSS Variable for Theme Color
      const primaryColor = state.settings.themeColor || '#3b82f6';
      styleTag.innerHTML = `
        :root {
            --primary: ${primaryColor};
        }
        .text-primary { color: var(--primary); }
        .bg-primary { background-color: var(--primary); }
        .border-primary { border-color: var(--primary); }
        ${state.settings.customCSS || ''}
      `;
  }, [state.settings]);

  // Update Settings Handler
  const updateSettings = (newSettings: SystemSettings) => {
      setState(prev => ({...prev, settings: newSettings}));
      localStorage.setItem('nst_system_settings', JSON.stringify(newSettings));
  };

  const handleAcceptTerms = () => {
      localStorage.setItem('nst_terms_accepted', 'true');
      setShowTerms(false);
      // Show welcome if not seen
      const hasSeenWelcome = localStorage.getItem('nst_has_seen_welcome');
      if (!hasSeenWelcome) setState(prev => ({ ...prev, showWelcome: true }));
  };

  // Timer Logic
  useEffect(() => {
    if (!state.user) return;

    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('nst_timer_date');
    const storedSeconds = parseInt(localStorage.getItem('nst_daily_study_seconds') || '0');

    if (storedDate !== today) {
        localStorage.setItem('nst_timer_date', today);
        localStorage.setItem('nst_daily_study_seconds', '0');
        setDailyStudySeconds(0);
    } else {
        setDailyStudySeconds(storedSeconds);
    }

    const interval = setInterval(() => {
        setDailyStudySeconds(prev => {
            const next = prev + 1;
            localStorage.setItem('nst_daily_study_seconds', next.toString());
            return next;
        });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.user?.id]);


  const handleStartApp = () => {
    localStorage.setItem('nst_has_seen_welcome', 'true');
    setState(prev => ({ ...prev, showWelcome: false }));
  };

  const handleLogin = (user: User) => {
    if(!user.progress) user.progress = {};
    if (user.isLocked) {
        alert("Account Locked. Contact Admin.");
        return;
    }
    localStorage.setItem('nst_current_user', JSON.stringify(user));
    localStorage.setItem('nst_has_seen_welcome', 'true');
    
    // REDESIGN: Admin -> STUDENT_DASHBOARD
    const nextView = 'STUDENT_DASHBOARD'; 
    const lang = user.board === 'BSEB' ? 'Hindi' : 'English';

    setState(prev => ({
      ...prev,
      user,
      view: nextView as any,
      selectedBoard: user.board || null,
      selectedClass: user.classLevel || null,
      selectedStream: user.stream || null,
      language: lang,
      showWelcome: false
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('nst_current_user');
    setState(prev => ({
      ...prev,
      user: null,
      originalAdmin: null, // Clear impersonation logic too
      view: 'BOARDS',
      selectedBoard: null,
      selectedClass: null,
      selectedStream: null,
      selectedSubject: null,
      lessonContent: null,
      language: 'English' 
    }));
    setDailyStudySeconds(0);
  };

  // --- IMPERSONATION LOGIC ---
  const handleImpersonate = (targetUser: User) => {
      if (state.user?.role !== 'ADMIN') return;
      
      const lang = targetUser.board === 'BSEB' ? 'Hindi' : 'English';
      setState(prev => ({
          ...prev,
          originalAdmin: prev.user, // Save Admin state
          user: targetUser,
          view: 'STUDENT_DASHBOARD',
          selectedBoard: targetUser.board || null,
          selectedClass: targetUser.classLevel || null,
          selectedStream: targetUser.stream || null,
          language: lang
      }));
  };

  const handleReturnToAdmin = () => {
      if (!state.originalAdmin) return;
      
      setState(prev => ({
          ...prev,
          user: prev.originalAdmin,
          originalAdmin: null,
          view: 'STUDENT_DASHBOARD', // REDESIGN: Stay in Student View but with Admin Powers
          selectedBoard: null,
          selectedClass: null
      }));
  };

  const handleBoardSelect = (board: Board) => { 
      const lang = board === 'BSEB' ? 'Hindi' : 'English';
      setState(prev => ({ ...prev, selectedBoard: board, view: 'CLASSES', language: lang })); 
  };
  const handleClassSelect = (level: ClassLevel) => { if (level === '11' || level === '12') { setState(prev => ({ ...prev, selectedClass: level, view: 'STREAMS' })); } else { setState(prev => ({ ...prev, selectedClass: level, selectedStream: null, view: 'SUBJECTS' })); } };
  const handleStreamSelect = (stream: Stream) => { setState(prev => ({ ...prev, selectedStream: stream, view: 'SUBJECTS' })); };
  const handleSubjectSelect = async (subject: Subject) => {
    setState(prev => ({ ...prev, selectedSubject: subject, loading: true }));
    try {
      if (state.selectedClass && state.selectedBoard) {
        const chapters = await fetchChapters(
          state.selectedBoard,
          state.selectedClass, 
          state.selectedStream, 
          subject, 
          state.language
        );
        setState(prev => ({ ...prev, chapters, view: 'CHAPTERS', loading: false }));
      }
    } catch (err) {
        console.error("Critical Error fetching chapters:", err);
        setState(prev => ({ 
            ...prev, 
            chapters: [{id: 'err-1', title: 'Offline Syllabus', description: 'Network Issue'}], 
            view: 'CHAPTERS', 
            loading: false 
        }));
    }
  };

  const onChapterClick = (chapter: Chapter) => {
      const chIndex = state.chapters.findIndex(c => c.id === chapter.id);
      const userProgress = state.user?.progress?.[state.selectedSubject!.id] || { currentChapterIndex: 0, totalMCQsSolved: 0 };
      
      if (state.user?.role !== 'ADMIN' && !state.originalAdmin) {
        if (chIndex > userProgress.currentChapterIndex) {
            const neededMCQ = 100 - userProgress.totalMCQsSolved;
            alert(`Chapter Locked!\n\nYou must solve ${neededMCQ > 0 ? neededMCQ : 0} more MCQs in Chapter ${userProgress.currentChapterIndex + 1} to unlock this.`);
            return;
        }
      }
      setTempSelectedChapter(chapter);
      setShowPremiumModal(true);
  };

  const handleContentGeneration = async (type: ContentType) => {
    setShowPremiumModal(false);
    if (!tempSelectedChapter || !state.user) return;
    
    if (state.user.role !== 'ADMIN' && !state.originalAdmin) {
         // COST LOGIC UPDATE
         // NOTES_SIMPLE = FREE
         // MCQ_SIMPLE = FREE
         // NOTES_PREMIUM / PDF = 5 Credits
         // MCQ_ANALYSIS (Premium MCQ) = 2 Credits
         
         let cost = 0;
         if (type === 'NOTES_PREMIUM' || type === 'PDF_NOTES') cost = 5; 
         if (type === 'MCQ_ANALYSIS') cost = 2; 

         if (cost > 0 && state.user.credits < cost) {
             alert(`Insufficient Credits! You need ${cost} credits.`);
             return;
         }
         
         if (cost > 0) {
            const updatedUser = { ...state.user, credits: state.user.credits - cost };
            localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
            const allUsers = JSON.parse(localStorage.getItem('nst_users') || '[]');
            const idx = allUsers.findIndex((u:User) => u.id === updatedUser.id);
            if (idx !== -1) { allUsers[idx] = updatedUser; localStorage.setItem('nst_users', JSON.stringify(allUsers)); }
            setState(prev => ({...prev, user: updatedUser}));
         }
    }

    setState(prev => ({ ...prev, selectedChapter: tempSelectedChapter, loading: true }));
    setGenerationDataReady(false); 

    try {
        const userProgress = state.user?.progress?.[state.selectedSubject!.id] || { currentChapterIndex: 0, totalMCQsSolved: 0 };
        const isPremium = state.user?.isPremium || state.user?.role === 'ADMIN';

        const content = await fetchLessonContent(
          state.selectedBoard!,
          state.selectedClass!,
          state.selectedStream!,
          state.selectedSubject!,
          tempSelectedChapter,
          state.language,
          type,
          userProgress.totalMCQsSolved,
          isPremium // Pass premium status
        );
        setState(prev => ({ ...prev, lessonContent: content }));
        setGenerationDataReady(true); 
    } catch (err) {
      console.error("Lesson Generation Error:", err);
      setState(prev => ({ 
          ...prev, 
          loading: false, 
          lessonContent: {
              id: 'err-content', 
              title: tempSelectedChapter.title, 
              subtitle: 'Offline Mode', 
              content: '# Content Unavailable\nCheck connection.', 
              type: type, 
              dateCreated: new Date().toISOString(), 
              subjectName: state.selectedSubject!.name 
          }, 
          view: 'LESSON' 
      }));
    }
  };
  
  const handleLoadingAnimationComplete = () => {
      setState(prev => ({ ...prev, loading: false, view: 'LESSON' }));
  };

  const updateMCQProgress = (count: number) => {
      if (!state.user || !state.selectedSubject) return;
      const subjId = state.selectedSubject.id;
      const currentProg = state.user.progress?.[subjId] || { currentChapterIndex: 0, totalMCQsSolved: 0 };
      const newTotal = currentProg.totalMCQsSolved + count;
      let newChapterIndex = currentProg.currentChapterIndex;
      if (newTotal >= 100) {
          if (currentProg.totalMCQsSolved < 100) {
              newChapterIndex = newChapterIndex + 1;
              alert(`🎉 Outstanding! You solved 100 MCQs.\n\nChapter ${newChapterIndex} COMPLETED.\nChapter ${newChapterIndex + 1} UNLOCKED!`);
          }
      }
      const updatedUser = {
         ...state.user,
         progress: {
             ...state.user.progress,
             [subjId]: {
                 currentChapterIndex: newChapterIndex,
                 totalMCQsSolved: newTotal >= 100 && currentProg.totalMCQsSolved < 100 ? 0 : newTotal
             }
         }
      };
      
      localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
      const allUsers = JSON.parse(localStorage.getItem('nst_users') || '[]');
      const idx = allUsers.findIndex((u:User) => u.id === updatedUser.id);
      if (idx !== -1) { allUsers[idx] = updatedUser; localStorage.setItem('nst_users', JSON.stringify(allUsers)); }
      setState(prev => ({...prev, user: updatedUser}));
  };

  const goBack = () => {
    setState(prev => {
      if (prev.view === 'RULES') return { ...prev, view: 'STUDENT_DASHBOARD' as any };
      if (prev.view === 'IIC') return { ...prev, view: 'STUDENT_DASHBOARD' as any };
      if (prev.view === 'AUDIO_STUDIO') return { ...prev, view: 'STUDENT_DASHBOARD' as any };
      if (prev.view === 'LESSON') return { ...prev, view: 'CHAPTERS', lessonContent: null };
      if (prev.view === 'CHAPTERS') {
          return { ...prev, view: 'SUBJECTS', selectedChapter: null };
      }
      if (prev.view === 'SUBJECTS') {
          const needsStream = ['11', '12'].includes(prev.selectedClass || '');
          return { ...prev, view: needsStream ? 'STREAMS' : 'CLASSES', selectedSubject: null };
      }
      if (prev.view === 'STREAMS') return { ...prev, view: 'CLASSES', selectedStream: null };
      if (prev.view === 'CLASSES') return { ...prev, view: 'BOARDS', selectedClass: null };
      if (prev.view === 'BOARDS') return { ...prev, view: 'STUDENT_DASHBOARD' as any, selectedBoard: null }; // Changed to prevent loop
      return prev;
    });
  };

  if (state.settings.maintenanceMode && state.user?.role !== 'ADMIN' && !state.originalAdmin) {
      return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center p-8">
              <div className="max-w-md">
                  <Lock size={64} className="mx-auto text-yellow-500 mb-6" />
                  <h1 className="text-3xl font-black text-white mb-2">System Under Maintenance</h1>
                  <p className="text-slate-400">The developer is updating the app. Please check back in a few minutes.</p>
                  <button onClick={handleLogout} className="mt-8 text-sm font-bold text-slate-500 hover:text-white">Admin Login</button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans relative">
      
      {/* IMPERSONATION RETURN BUTTON */}
      {state.originalAdmin && (
          <div className="fixed bottom-6 right-6 z-[90] animate-bounce">
              <button 
                  onClick={handleReturnToAdmin}
                  className="bg-red-600 text-white font-bold py-3 px-6 rounded-full shadow-2xl flex items-center gap-2 border-4 border-white hover:bg-red-700 hover:scale-105 transition-all"
              >
                  <EyeOff size={20} /> Exit User View
              </button>
          </div>
      )}

      {/* Terms Popup */}
      {showTerms && <TermsPopup onClose={handleAcceptTerms} />}

      <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
           <div onClick={() => setState(prev => ({ ...prev, view: 'STUDENT_DASHBOARD' as any }))} className="flex items-center gap-3 cursor-pointer group">
               <div className="bg-[var(--primary)] rounded-xl p-2 text-white shadow-md"><BrainCircuit size={24} /></div>
               <div>
                   <h1 className="text-xl md:text-2xl font-black tracking-tight leading-none text-slate-800">
                       {state.settings.appName}
                   </h1>
                   <p className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest mt-0.5">Personal Assistant</p>
               </div>
           </div>
           {state.user && (
               <div className="flex items-center gap-2">
                   <button onClick={() => setState(prev => ({...prev, view: 'IIC'}))} className="p-2 text-slate-400 hover:bg-slate-50 hover:text-[var(--primary)] rounded-full transition-all" title="IIC Gallery"><Newspaper size={20} /></button>
                   <button onClick={() => setState(prev => ({...prev, view: 'RULES'}))} className="p-2 text-slate-400 hover:bg-slate-50 hover:text-[var(--primary)] rounded-full transition-all" title="Rules & Guide"><KeyRound size={20} /></button>
                   <div className="text-right hidden md:block pl-4 ml-2 border-l border-slate-100">
                       <div className="text-sm font-bold text-slate-800">{state.user.name}</div>
                       <div className="text-[10px] text-slate-400 font-bold uppercase">{state.user.id}</div>
                   </div>
                   <button onClick={handleLogout} className="p-2 text-red-400 hover:bg-red-50 rounded-full ml-2"><LogOut size={20} /></button>
               </div>
           )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-6">
        {!state.user ? (
            <Auth onLogin={handleLogin} />
        ) : (
            <>
                {state.view === 'IIC' && <IICPage user={state.user} onBack={goBack} />}
                {state.view === 'RULES' && <RulesPage onBack={goBack} />}

                {/* REDESIGN: ADMIN DASHBOARD HIDDEN / REMOVED from Direct Access */}
                {state.view === 'ADMIN_DASHBOARD' && (
                     <AdminDashboard 
                         onNavigate={(v) => setState(prev => ({...prev, view: v}))} 
                         settings={state.settings}
                         onUpdateSettings={updateSettings}
                         onImpersonate={handleImpersonate}
                     />
                )}
                
                {state.view === 'STUDENT_DASHBOARD' as any && (
                    <StudentDashboard 
                        user={state.user} 
                        dailyStudySeconds={dailyStudySeconds}
                        onSubjectSelect={handleSubjectSelect} 
                        onRedeemSuccess={u => setState(prev => ({...prev, user: u}))}
                        settings={state.settings} 
                        onOpenAdminTools={() => setState(prev => ({...prev, view: 'ADMIN_DASHBOARD'}))} 
                    />
                )}
                
                {state.view === 'BOARDS' && <BoardSelection onSelect={handleBoardSelect} onBack={goBack} />}
                {state.view === 'CLASSES' && (
                    <ClassSelection 
                        selectedBoard={state.selectedBoard} 
                        allowedClasses={state.settings.allowedClasses} // PASS ALLOWED CLASSES
                        onSelect={handleClassSelect} 
                        onBack={goBack} 
                    />
                )}
                {state.view === 'STREAMS' && <StreamSelection onSelect={handleStreamSelect} onBack={goBack} />}
                {state.view === 'SUBJECTS' && state.selectedClass && <SubjectSelection classLevel={state.selectedClass} stream={state.selectedStream} onSelect={handleSubjectSelect} onBack={goBack} />}
                {state.view === 'CHAPTERS' && state.selectedSubject && (
                    <ChapterSelection 
                        chapters={state.chapters} 
                        subject={state.selectedSubject} 
                        classLevel={state.selectedClass!} 
                        stream={state.selectedStream}
                        board={state.selectedBoard || undefined}
                        loading={state.loading && state.view === 'CHAPTERS'} 
                        user={state.user}
                        onSelect={onChapterClick} 
                        onBack={goBack}
                    />
                )}
                {state.view === 'LESSON' && state.lessonContent && (
                    <LessonView 
                        content={state.lessonContent} 
                        subject={state.selectedSubject!} 
                        classLevel={state.selectedClass!} 
                        chapter={state.selectedChapter!} 
                        loading={false}
                        onBack={goBack}
                        isPremium={state.user.isPremium || state.user.role === 'ADMIN'}
                        onMCQComplete={(count) => updateMCQProgress(count)} 
                    />
                )}
            </>
        )}
      </main>
      
      <footer className="bg-white border-t border-slate-100 py-6 text-center mt-auto">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
              App Developed by Nadim Anwar
          </p>
      </footer>

      {state.loading && <LoadingOverlay dataReady={generationDataReady} onComplete={handleLoadingAnimationComplete} />}
      {showPremiumModal && tempSelectedChapter && state.user && (
          <PremiumModal chapter={tempSelectedChapter} credits={state.user.credits || 0} isAdmin={state.user.role === 'ADMIN'} onSelect={handleContentGeneration} onClose={() => setShowPremiumModal(false)} />
      )}
      {state.showWelcome && <WelcomePopup onStart={handleStartApp} isResume={!!state.user} />}
    </div>
  );
};
export default App;
