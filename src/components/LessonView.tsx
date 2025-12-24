
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { LessonContent, Subject, ClassLevel, Chapter, MCQItem, ContentType } from '../types';
import { fetchLessonContent } from '../services/gemini';
import { ArrowLeft, Share2, Crown, Volume2, PauseCircle, Download, CheckCircle, XCircle, ChevronRight, PlayCircle, Image as ImageIcon, Copy, Check, BarChart3, RefreshCcw, Award, Star, Zap, FlaskConical, FileText, ExternalLink, Youtube, ListVideo, Play } from 'lucide-react';
import katex from 'katex';

interface Props {
  content: LessonContent | null;
  subject: Subject;
  classLevel: ClassLevel;
  chapter: Chapter;
  loading: boolean;
  onBack: () => void;
  onMCQComplete?: (count: number) => void; // Optional callback
  isPremium?: boolean; // NEW PROP
}

export const LessonView: React.FC<Props> = ({ 
  content, 
  subject, 
  classLevel, 
  chapter,
  loading, 
  onBack,
  onMCQComplete,
  isPremium = false
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // MCQ State
  const [mcqList, setMcqList] = useState<MCQItem[]>([]);
  const [mcqLoading, setMcqLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({}); 
  const [showAnalysis, setShowAnalysis] = useState(false); // To show explanations inline
  const [showReport, setShowReport] = useState(false); // To show final scorecard
  
  // Video Playlist State
  const [currentVideo, setCurrentVideo] = useState<string>('');
  const [videoList, setVideoList] = useState<string[]>([]);
  
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (content?.mcqData) {
        if (mcqList.length === 0) {
            setMcqList(content.mcqData);
        }
    }
    
    // Video Logic
    if (content?.type === 'VIDEO_LINK' as any) {
        const anyContent = content as any;
        if (Array.isArray(anyContent.videoLinks) && anyContent.videoLinks.length > 0) {
            setVideoList(anyContent.videoLinks.filter((l: string) => l));
            setCurrentVideo(anyContent.videoLinks[0]);
        } else if (content.content) {
            setVideoList([content.content]);
            setCurrentVideo(content.content);
        }
    }
  }, [content]);

  // When answering, track progress
  const handleAnswerSelect = (qIdx: number, optIdx: number) => {
      if (showReport) return; // Disable changing answers after submit
      if (selectedAnswers[qIdx] !== undefined) return; // Already answered
      
      setSelectedAnswers(prev => ({...prev, [qIdx]: optIdx}));
      
      // Increment score for user progress tracking (DB side)
      if (onMCQComplete) {
          onMCQComplete(1); 
      }
  };

  const calculateResults = () => {
      let correct = 0;
      let wrong = 0;
      let unattempted = 0;

      mcqList.forEach((item, idx) => {
          const userAns = selectedAnswers[idx];
          if (userAns === undefined) {
              unattempted++;
          } else if (userAns === item.correctAnswer) {
              correct++;
          } else {
              wrong++;
          }
      });

      const total = mcqList.length;
      const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
      
      return { correct, wrong, unattempted, percentage, total };
  };

  const handleFinishTest = () => {
      setShowReport(true);
      setShowAnalysis(true); // Automatically show analysis behind the modal so they can review later
  };

  const handlePracticeMore = async () => {
      // Reset State
      setShowReport(false);
      setShowAnalysis(false);
      setSelectedAnswers({});
      
      // Load New Questions
      setMcqLoading(true);
      try {
          const newContent = await fetchLessonContent(
             'CBSE', // You might want to pass this prop from parent in real app
             classLevel,
             null, 
             subject,
             chapter,
             'English', 
             content?.type || 'MCQ_ANALYSIS', 
             mcqList.length, // Pass count so AI generates new questions
             isPremium // Pass premium status to retry logic
          );
          if (newContent.mcqData) {
              setMcqList(newContent.mcqData); // Replace list with new questions
          }
      } catch (e) {
          console.error(e);
      } finally {
          setMcqLoading(false);
      }
  };

  const handleRetry = () => {
      // Reset only logic, keep same questions
      setShowReport(false);
      setShowAnalysis(false);
      setSelectedAnswers({});
  };

  // ... Audio/Copy Logic
  const toggleAudio = (text: string) => {
     // Clean text of all custom tags for speech
     const cleanText = text
        .replace(/\[\[.*?\|/g, '') // remove [[red|
        .replace(/\]\]/g, '')      // remove ]]
        .replace(/\$\$/g, '')      // remove $$
        .replace(/#/g, '');        // remove markdown headers
     
     const u = new SpeechSynthesisUtterance(cleanText);
     window.speechSynthesis.speak(u);
     setIsSpeaking(true); u.onend = () => setIsSpeaking(false);
  };
  const handleCopy = () => { navigator.clipboard.writeText(content?.content || ''); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  const handleDownload = () => window.open(content?.content, '_blank');
  
  const getEmbedUrl = (url: string) => {
      if (!url) return '';
      // YouTube
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
          let id = '';
          if (url.includes('v=')) id = url.split('v=')[1].split('&')[0];
          else if (url.includes('youtu.be/')) id = url.split('youtu.be/')[1];
          
          if(id) return `https://www.youtube.com/embed/${id}`;
      }
      // Google Drive
      if (url.includes('drive.google.com/file/d/')) {
          return url.replace('/view', '/preview');
      }
      return url;
  };

  // PREMIUM RENDERING LOGIC (Colors, Icons, Math)
  const renderCustomText = (text: React.ReactNode) => {
      // Only process if text is a string
      if (typeof text !== 'string') return text;

      // Split by Custom Color Tags [[color|Text]] AND Math Tags $$Formula$$
      const parts = text.split(/(\[\[.*?\]\]|\$\$[^\$]+\$\$)/g);
      
      return parts.map((part, index) => {
          // Handle Custom Colors/Images [[...]]
          if (part.startsWith('[[') && part.endsWith(']]')) {
              const inner = part.slice(2, -2);
              
              if (inner.startsWith('IMAGE:')) {
                  const desc = inner.replace('IMAGE:', '').trim();
                  return (
                      <div key={index} className="my-6 p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-center group hover:border-blue-400 transition-colors print:border-solid print:bg-white">
                          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 print:hidden"><ImageIcon size={24} /></div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">AI Diagram</p>
                          <p className="font-medium text-slate-700 italic">"{desc}"</p>
                      </div>
                  );
              }
              
              // Handle Colors
              const [color, ...contentParts] = inner.split('|');
              const contentText = contentParts.join('|');
              
              if (color === 'red') return <span key={index} className="text-red-700 font-bold bg-red-50 px-1 rounded border border-red-100 mx-0.5">{contentText}</span>;
              if (color === 'blue') return <span key={index} className="text-blue-700 font-bold">{contentText}</span>;
              if (color === 'green') return <span key={index} className="text-emerald-700 font-bold bg-emerald-50 px-1 rounded border border-emerald-100 mx-0.5">{contentText}</span>;
              
              return <span key={index} className="font-bold">{contentText}</span>;
          }
          
          // Handle Math/Science Formulas $$...$$ using KaTeX
          if (part.startsWith('$$') && part.endsWith('$$')) {
              const mathContent = part.slice(2, -2);
              try {
                  const html = katex.renderToString(mathContent, {
                      throwOnError: false,
                      displayMode: false // Inline math
                  });
                  return (
                      <span 
                        key={index} 
                        className="math-formula inline-block" 
                        dangerouslySetInnerHTML={{__html: html}} 
                        title="Formula"
                      />
                  );
              } catch (e) {
                  return <span key={index} className="text-red-500 font-mono text-xs">{mathContent}</span>;
              }
          }

          return <span key={index}>{part}</span>;
      });
  };

  // Safe Child Renderer: Prevents [object Object] by handling React Nodes gracefully
  const safeRender = (children: React.ReactNode) => {
      return React.Children.map(children, child => {
          if (typeof child === 'string') {
              return renderCustomText(child);
          }
          // If it's an object (like a <strong> or <em> or <img> from markdown), return as is
          return child; 
      });
  };

  if (loading) return <div className="p-10 text-center">Loading AI Content...</div>;
  if (!content) return null;

  const isPremiumContent = content.type === 'NOTES_PREMIUM';
  const isMCQ = content.type === 'MCQ_ANALYSIS' || content.type === 'MCQ_SIMPLE';
  const isPdf = content.type === 'PDF_NOTES' || content.type === 'NOTES_PREMIUM'; // Treat premium notes as PDF-like if URL provided
  const isSimpleMCQ = content.type === 'MCQ_SIMPLE';
  const isVideo = content.type === 'VIDEO_LINK' as any;

  // Result Calculation
  const result = calculateResults();

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 pb-20 relative h-full">
      
      {/* RESULT REPORT OVERLAY */}
      {showReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in zoom-in">
              <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
                  <div className={`p-6 text-center text-white ${result.percentage >= 40 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-orange-600'}`}>
                      <Award size={48} className="mx-auto mb-2 opacity-90" />
                      <h2 className="text-3xl font-black">{result.percentage}%</h2>
                      <p className="font-medium opacity-90">{result.percentage >= 40 ? 'Great Job!' : 'Need Improvement'}</p>
                  </div>
                  
                  <div className="p-6">
                      <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                          <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                              <div className="text-xl font-bold text-green-600">{result.correct}</div>
                              <div className="text-[10px] uppercase font-bold text-green-400">Correct</div>
                          </div>
                          <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                              <div className="text-xl font-bold text-red-600">{result.wrong}</div>
                              <div className="text-[10px] uppercase font-bold text-red-400">Wrong</div>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div className="text-xl font-bold text-slate-600">{result.unattempted}</div>
                              <div className="text-[10px] uppercase font-bold text-slate-400">Skipped</div>
                          </div>
                      </div>

                      <div className="space-y-3">
                          <button 
                             onClick={() => setShowReport(false)} // Just close modal to see analysis
                             className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                          >
                             Review Answers
                          </button>
                          <button 
                             onClick={handlePracticeMore}
                             className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors flex items-center justify-center gap-2"
                          >
                             {mcqLoading ? 'Loading...' : 'Practice More'} <ChevronRight size={18} />
                          </button>
                          <button 
                             onClick={onBack}
                             className="w-full py-3 text-slate-400 font-bold rounded-xl hover:text-slate-600 text-sm"
                          >
                             Quit Lesson
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200 z-20 px-4 py-3 mb-6 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all text-sm font-medium">
                <ArrowLeft size={18} /> Back
            </button>
            <div className="flex gap-2">
                {(isPremiumContent || showAnalysis) && <button onClick={() => toggleAudio(isMCQ ? mcqList.map(m=>m.explanation).join('. ') : content.content)} className="p-2 text-slate-400 hover:text-blue-600"><Volume2 /></button>}
                {!isMCQ && !isPdf && !isVideo && <button onClick={handleCopy} className="p-2 text-slate-400 hover:text-blue-600"><Copy /></button>}
                {(isPremiumContent || isPdf) && <button onClick={handleDownload} className="p-2 text-slate-400 hover:text-green-600"><ExternalLink size={20} /></button>}
            </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 h-full">
        <header className="mb-8 text-center">
             {isPremiumContent && !isPdf && <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-orange-100 text-orange-600 text-xs font-bold uppercase mb-4"><Crown size={14} /> Premium Notes</div>}
             {isSimpleMCQ && <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-green-100 text-green-600 text-xs font-bold uppercase mb-4">Free Practice</div>}
             {isPdf && <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold uppercase mb-4"><FileText size={14} /> Official PDF</div>}
             {isVideo && <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold uppercase mb-4"><Youtube size={14} /> Video Class</div>}
             <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4">{content.title}</h1>
        </header>

        {isVideo && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-black aspect-video rounded-2xl overflow-hidden shadow-xl border border-slate-200 relative">
                        {currentVideo ? (
                             <iframe 
                                src={getEmbedUrl(currentVideo)} 
                                className="w-full h-full" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white">Select a video</div>
                        )}
                    </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 h-fit max-h-[400px] overflow-y-auto">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ListVideo size={18}/> Playlist</h3>
                    <div className="space-y-2">
                        {videoList.length === 0 && <p className="text-sm text-slate-400">No videos available.</p>}
                        {videoList.map((link, idx) => (
                             <button 
                                key={idx} 
                                onClick={() => setCurrentVideo(link)}
                                className={`w-full p-3 rounded-xl flex items-center gap-3 text-left transition-all ${currentVideo === link ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-slate-700 hover:bg-slate-200'}`}
                             >
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${currentVideo === link ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                     {idx + 1}
                                 </div>
                                 <div className="flex-1 overflow-hidden">
                                     <div className="text-xs font-bold uppercase opacity-70">Part {idx + 1}</div>
                                     <div className="truncate text-sm font-medium">Video Lesson</div>
                                 </div>
                                 {currentVideo === link && <Play size={16} fill="currentColor"/>}
                             </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* PDF RENDERER (Also handles Premium Notes if they are URL based) */}
        {isPdf && content.content.startsWith('http') && (
            <div className="min-h-[70vh] bg-slate-50 border-2 border-slate-200 rounded-2xl overflow-hidden relative">
                <iframe 
                    src={content.content.includes('.pdf') || content.content.includes('drive.google.com') 
                        ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(content.content)}` 
                        : content.content} 
                    className="w-full h-[80vh] border-0"
                    allow="autoplay"
                ></iframe>
                
                <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                    <a 
                        href={content.content} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-slate-900/90 text-white px-6 py-3 rounded-full font-bold shadow-lg pointer-events-auto hover:bg-black transition-colors flex items-center gap-2 text-sm"
                    >
                        <ExternalLink size={16} /> Open External Link
                    </a>
                </div>
            </div>
        )}

        {isMCQ && (
            <div className="space-y-8">
                {mcqList.map((item, idx) => {
                    const selected = selectedAnswers[idx];
                    const isCorrect = selected === item.correctAnswer;
                    const showFeedback = selected !== undefined || showAnalysis;
                    
                    return (
                        <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex gap-3">
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-sm h-fit">Q{idx + 1}</span>
                                <span className="flex-1">{safeRender(item.question)}</span>
                            </h3>
                            <div className="grid gap-3 mb-4">
                                {item.options.map((opt, optIdx) => {
                                    let btnClass = "border-slate-200 hover:bg-slate-50";
                                    
                                    // Feedback Logic
                                    if (showFeedback) {
                                        if (optIdx === item.correctAnswer) {
                                            btnClass = "border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500";
                                        } else if (optIdx === selected) {
                                            btnClass = "border-red-500 bg-red-50 text-red-700";
                                        } else {
                                            btnClass = "border-slate-100 opacity-50";
                                        }
                                    } else {
                                        if (selected === optIdx) btnClass = "border-blue-500 bg-blue-50 text-blue-700";
                                    }

                                    return (
                                        <button 
                                            key={optIdx}
                                            disabled={showFeedback && !showAnalysis}
                                            onClick={() => handleAnswerSelect(idx, optIdx)}
                                            className={`w-full text-left p-4 rounded-xl border-2 font-medium transition-all ${btnClass}`}
                                        >
                                            <span className="font-bold mr-2">{String.fromCharCode(65 + optIdx)}.</span> {safeRender(opt)}
                                        </button>
                                    );
                                })}
                            </div>
                            {(showAnalysis || (selected !== undefined && showAnalysis)) && (
                                <div className={`p-4 rounded-xl border-l-4 text-sm animate-in fade-in slide-in-from-top-2 ${item.correctAnswer === selected ? 'bg-green-50 border-green-500' : 'bg-slate-50 border-slate-400'}`}>
                                    <h4 className="font-bold mb-1 flex items-center gap-2">
                                        <CheckCircle size={16} className="text-green-600" /> Explanation:
                                    </h4>
                                    <div className="text-slate-700">{safeRender(item.explanation)}</div>
                                </div>
                            )}
                        </div>
                    );
                })}

                <div className="flex flex-col md:flex-row gap-4 justify-center py-8">
                     {/* Show Finish button if report not shown yet */}
                    {!showReport && !showAnalysis && (
                         <button 
                            onClick={handleFinishTest} 
                            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2 justify-center"
                         >
                            <BarChart3 size={20} /> Finish & See Result
                        </button>
                    )}

                    {/* Navigation Options if Reviewing */}
                    {(showAnalysis || showReport) && (
                         <>
                            <button 
                                onClick={handlePracticeMore} 
                                disabled={mcqLoading}
                                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 disabled:opacity-50"
                            >
                                {mcqLoading ? 'Generating...' : `Practice More Questions`} <ChevronRight size={18} />
                            </button>
                             <button 
                                onClick={handleRetry} 
                                className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                                <RefreshCcw size={18} /> Retry Same Questions
                            </button>
                         </>
                    )}
                </div>
            </div>
        )}

        {!isMCQ && !isPdf && !isVideo && (
            <div className={`markdown-body p-6 md:p-12 rounded-xl border ${isPremiumContent ? 'bg-[#fffdf5] border-yellow-200 shadow-md' : 'bg-white border-slate-100'}`}>
                 <ReactMarkdown components={{
                        p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-slate-800">{safeRender(props.children)}</p>,
                        
                        // CUSTOM LIST ITEM - Replaces dots with Icons
                        li: ({node, ...props}) => (
                            <li className="mb-3 pl-1 flex items-start gap-3">
                                <span className={`mt-1 shrink-0 ${isPremiumContent ? 'text-blue-500' : 'text-slate-400'}`}>
                                    {isPremiumContent ? <Star size={14} fill="currentColor" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></div>}
                                </span>
                                <span className="leading-relaxed">{safeRender(props.children)}</span>
                            </li>
                        ),
                        
                        ul: ({node, ...props}) => <ul className="mb-6 space-y-2">{props.children}</ul>,
                        
                        h1: ({node, ...props}) => <h1 className="text-3xl font-black text-slate-900 mt-8 mb-4 border-b border-slate-200 pb-3 flex items-center gap-3"><Crown className="text-yellow-500" size={28} /> {props.children}</h1>,
                        
                        h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-blue-800 mt-8 mb-4 flex items-center gap-2"><Zap className="text-blue-500" size={20} /> {props.children}</h2>,
                        
                        h3: ({node, ...props}) => <h3 className="text-xl font-bold text-slate-700 mt-6 mb-3">{props.children}</h3>,

                        strong: ({node, ...props}) => <strong className="font-bold text-slate-900 bg-slate-100 px-1 rounded">{props.children}</strong>
                    }}>
                    {content.content}
                </ReactMarkdown>
            </div>
        )}
      </article>
    </div>
  );
};
