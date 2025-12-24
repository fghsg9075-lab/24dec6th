import React, { useState } from 'react';
import { Chapter, Subject, ClassLevel, User, Stream, Board } from '../types';
import { BookOpen, ChevronRight, Lock, CheckCircle, PlayCircle, Clock, Edit } from 'lucide-react';
import { AdminContentManager } from './AdminContentManager';

interface Props {
  chapters: Chapter[];
  subject: Subject;
  classLevel: ClassLevel;
  stream?: Stream | null;
  board?: Board;
  loading: boolean;
  user: User | null;
  onSelect: (chapter: Chapter) => void;
  onBack: () => void;
}

export const ChapterSelection: React.FC<Props> = ({ 
  chapters, 
  subject, 
  classLevel, 
  stream,
  board,
  loading, 
  user,
  onSelect, 
  onBack 
}) => {
  const [adminModalChapter, setAdminModalChapter] = useState<Chapter | null>(null);
  
  // Get current progress for this subject
  const userProgress = user?.progress?.[subject.id] || { currentChapterIndex: 0, totalMCQsSolved: 0 };
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto">
       <div className="flex items-center mb-8 sticky top-0 bg-slate-50 py-4 z-10">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-800 transition-colors mr-4 font-medium flex items-center gap-1">
           Back
        </button>
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
             <span>Class {classLevel}</span>
             <span>/</span>
             <span className="font-medium text-slate-700">{subject.name}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Syllabus & Chapters</h2>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
             <div key={i} className="h-24 bg-white rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {chapters.map((chapter, index) => {
            // Logic for Lock/Unlock
            const isCompleted = index < userProgress.currentChapterIndex;
            const isCurrent = index === userProgress.currentChapterIndex;
            const isLocked = !isAdmin && index > userProgress.currentChapterIndex;
            
            return (
              <div key={chapter.id} className="relative group">
                {isAdmin && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setAdminModalChapter(chapter);
                    }}
                    className="absolute top-2 right-2 z-20 p-2 bg-slate-900 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                    title="Admin Edit Content"
                  >
                    <Edit size={16} />
                  </button>
                )}
                
                <button
                  onClick={() => onSelect(chapter)}
                  disabled={isLocked}
                  className={`w-full p-5 rounded-xl border transition-all text-left flex items-center relative overflow-hidden ${
                      isLocked 
                      ? 'bg-slate-100 border-slate-200 opacity-70 cursor-not-allowed' 
                      : isCurrent 
                          ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' 
                          : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {/* Status Indicator Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      isLocked ? 'bg-slate-300' : isCurrent ? 'bg-blue-600' : 'bg-green-500'
                  }`}></div>

                  <div className="mr-5 ml-2 min-w-[3.5rem] flex flex-col items-center">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CH</span>
                     <span className={`text-2xl font-bold ${isCurrent ? 'text-blue-600' : isLocked ? 'text-slate-400' : 'text-green-600'}`}>
                         {(index + 1).toString().padStart(2, '0')}
                     </span>
                  </div>
                  
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-bold text-lg ${isLocked ? 'text-slate-500' : 'text-slate-800'}`}>
                            {chapter.title}
                        </h3>
                        {isCurrent && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold animate-pulse">ROUTINE ACTIVE</span>}
                    </div>
                    
                    {isLocked ? (
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                            <Lock size={12} />
                            <span>Complete previous chapter MCQs (100) to unlock</span>
                        </div>
                    ) : isCurrent ? (
                        <div className="flex items-center gap-3 text-xs">
                            <span className={`font-bold ${userProgress.totalMCQsSolved < 100 ? 'text-orange-500' : 'text-green-600'}`}>
                               Target: {userProgress.totalMCQsSolved}/100 MCQs
                            </span>
                            <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(userProgress.totalMCQsSolved, 100)}%` }}></div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-green-600 font-bold flex items-center gap-1">
                            <CheckCircle size={12} /> Completed
                        </div>
                    )}
                  </div>

                  <div className="ml-2">
                    {isLocked ? (
                        <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center">
                            <Lock size={18} />
                        </div>
                    ) : isCurrent ? (
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <PlayCircle size={20} />
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center border border-green-100">
                            <BookOpen size={18} />
                        </div>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
          
          {chapters.length === 0 && !loading && (
             <div className="text-center py-20 text-slate-400">
                <BookOpen size={48} className="mx-auto mb-4 opacity-50"/>
                <p>No chapters found. Please try refreshing.</p>
             </div>
          )}
        </div>
      )}

      {adminModalChapter && (
        <AdminContentManager 
           chapter={adminModalChapter}
           subject={subject}
           classLevel={classLevel}
           stream={stream || null}
           board={board || 'CBSE'}
           onClose={() => setAdminModalChapter(null)}
        />
      )}
    </div>
  );
};
