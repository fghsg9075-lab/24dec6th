
import React, { useState } from 'react';
import { Chapter, ContentType, LessonContent, Subject, ClassLevel, Stream, Board } from '../types';
import { FileText, Youtube, List, Save, X, ExternalLink, Trash2, Plus, Copy } from 'lucide-react';
import { fetchLessonContent } from '../services/gemini';

interface AdminContentManagerProps {
    chapter: Chapter;
    subject: Subject;
    classLevel: ClassLevel;
    stream: Stream | null;
    board: Board;
    onClose: () => void;
}

export const AdminContentManager: React.FC<AdminContentManagerProps> = ({ chapter, subject, classLevel, stream, board, onClose }) => {
    const [activeTab, setActiveTab] = useState<'PDF' | 'VIDEO' | 'MCQ'>('PDF');
    const [loading, setLoading] = useState(false);

    // PDF State
    const [pdfType, setPdfType] = useState<'NOTES_SIMPLE' | 'NOTES_PREMIUM' | 'PDF_NOTES'>('PDF_NOTES');
    const [pdfUrl, setPdfUrl] = useState('');
    
    // Video State
    const [videoLinks, setVideoLinks] = useState<string[]>(Array(10).fill(''));

    // MCQ State
    const [mcqText, setMcqText] = useState('');

    const getStorageKey = (type: ContentType) => {
        const streamKey = (classLevel === '11' || classLevel === '12') ? `-${stream}` : '';
        return `nst_custom_lesson_${board}-${classLevel}${streamKey}-${subject.name}-${chapter.id}-${type}`;
    };

    // Load Data on Mount
    React.useEffect(() => {
        // Load existing data if available
        if (activeTab === 'PDF') {
            const keys = ['PDF_NOTES', 'NOTES_PREMIUM', 'NOTES_SIMPLE'];
            for (const k of keys) {
                const data = localStorage.getItem(getStorageKey(k as ContentType));
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        setPdfType(parsed.type);
                        setPdfUrl(parsed.content); // Assuming content holds the URL for PDF
                        break;
                    } catch (e) {}
                }
            }
        } else if (activeTab === 'VIDEO') {
            const data = localStorage.getItem(getStorageKey('VIDEO_LINK' as any)); // Using a new type or repurposing
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed.videoLinks)) {
                        const links = [...parsed.videoLinks, ...Array(10).fill('')].slice(0, 10);
                        setVideoLinks(links);
                    }
                } catch (e) {}
            }
        } else if (activeTab === 'MCQ') {
             const data = localStorage.getItem(getStorageKey('MCQ_SIMPLE'));
             if (data) {
                 try {
                     const parsed = JSON.parse(data);
                     if (parsed.mcqRaw) setMcqText(parsed.mcqRaw);
                 } catch (e) {}
             }
        }
    }, [activeTab]);

    const handleSavePDF = () => {
        if (!pdfUrl.trim()) return alert("Please enter a PDF URL");
        
        const content: LessonContent = {
            id: Date.now().toString(),
            title: chapter.title,
            subtitle: pdfType === 'PDF_NOTES' ? 'Visual PDF' : 'Text Notes',
            content: pdfUrl,
            type: pdfType,
            dateCreated: new Date().toISOString(),
            subjectName: subject.name
        };
        
        localStorage.setItem(getStorageKey(pdfType), JSON.stringify(content));
        alert("PDF Content Saved!");
        onClose();
    };

    const handleSaveVideo = () => {
        const validLinks = videoLinks.filter(l => l.trim() !== '');
        if (validLinks.length === 0) return alert("Add at least one video link");

        const content = {
            id: Date.now().toString(),
            title: chapter.title,
            subtitle: 'Video Playlist',
            content: validLinks[0], // Primary link
            videoLinks: validLinks, // New field for playlist
            type: 'VIDEO_LINK', // Custom type we will need to handle
            dateCreated: new Date().toISOString(),
            subjectName: subject.name
        };

        // We use a custom key for Video Playlist
        localStorage.setItem(getStorageKey('VIDEO_LINK' as any), JSON.stringify(content));
        alert("Video Playlist Saved!");
        onClose();
    };

    const handleSaveMCQ = () => {
        if (!mcqText.trim()) return alert("Paste Google Sheet data first");
        
        // Simple parser for Tab Separated Values (Google Sheets copy paste)
        // Format assumption: Question | Option A | Option B | Option C | Option D | Answer (A/B/C/D) | Explanation
        const rows = mcqText.trim().split('\n');
        const mcqs = rows.map(row => {
            const cols = row.split('\t');
            if (cols.length < 6) return null;
            
            const [q, a, b, c, d, ans, exp] = cols;
            const options = [a, b, c, d];
            const ansIndex = ['A', 'B', 'C', 'D'].indexOf(ans?.trim().toUpperCase());
            
            return {
                question: q,
                options: options,
                correctAnswer: ansIndex !== -1 ? ansIndex : 0,
                explanation: exp || ''
            };
        }).filter(item => item !== null);

        if (mcqs.length === 0) return alert("Could not parse data. Ensure Tab Separated format.");

        const content: LessonContent = {
             id: Date.now().toString(),
             title: chapter.title,
             subtitle: 'Practice MCQs',
             content: JSON.stringify(mcqs),
             type: 'MCQ_SIMPLE',
             mcqData: mcqs as any,
             mcqRaw: mcqText, // Store raw text to edit later
             dateCreated: new Date().toISOString(),
             subjectName: subject.name
        };

        localStorage.setItem(getStorageKey('MCQ_SIMPLE'), JSON.stringify(content));
        alert(`Saved ${mcqs.length} MCQs!`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                             Admin Content Manager
                        </h3>
                        <p className="text-xs text-slate-500 font-bold">{chapter.title}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20}/></button>
                </div>

                <div className="flex border-b border-slate-200">
                    <button onClick={() => setActiveTab('PDF')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'PDF' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500'}`}><FileText size={16}/> PDF / Notes</button>
                    <button onClick={() => setActiveTab('VIDEO')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'VIDEO' ? 'bg-white text-red-600 border-b-2 border-red-600' : 'bg-slate-50 text-slate-500'}`}><Youtube size={16}/> Video Playlist</button>
                    <button onClick={() => setActiveTab('MCQ')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'MCQ' ? 'bg-white text-green-600 border-b-2 border-green-600' : 'bg-slate-50 text-slate-500'}`}><List size={16}/> MCQ Sheet</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-white">
                    {activeTab === 'PDF' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-3">
                                <button onClick={() => setPdfType('NOTES_SIMPLE')} className={`p-3 border rounded-xl text-xs font-bold ${pdfType === 'NOTES_SIMPLE' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-500'}`}>Simple Note</button>
                                <button onClick={() => setPdfType('NOTES_PREMIUM')} className={`p-3 border rounded-xl text-xs font-bold ${pdfType === 'NOTES_PREMIUM' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' : 'border-slate-200 text-slate-500'}`}>Premium Note</button>
                                <button onClick={() => setPdfType('PDF_NOTES')} className={`p-3 border rounded-xl text-xs font-bold ${pdfType === 'PDF_NOTES' ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-200 text-slate-500'}`}>Ultra PDF</button>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Google Drive / PDF URL</label>
                                <div className="flex items-center gap-2 border-2 border-slate-200 rounded-xl px-3 py-3 focus-within:border-blue-500 transition-colors">
                                    <ExternalLink size={18} className="text-slate-400"/>
                                    <input type="url" placeholder="https://..." className="flex-1 outline-none text-sm font-medium" value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} />
                                </div>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-700 leading-relaxed">
                                <strong>Tip:</strong> For Google Drive, ensure the link is set to "Anyone with the link". The app will automatically optimize it for embedding.
                            </div>
                            <button onClick={handleSavePDF} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-blue-700"><Save size={18}/> Save PDF Content</button>
                        </div>
                    )}

                    {activeTab === 'VIDEO' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500 uppercase">Playlist Links (Max 10)</label>
                                <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500">{videoLinks.filter(l => l).length} Added</span>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                {videoLinks.map((link, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400 w-6">#{idx + 1}</span>
                                        <input 
                                            type="url" 
                                            placeholder="YouTube or Drive Video Link" 
                                            value={link}
                                            onChange={(e) => {
                                                const newLinks = [...videoLinks];
                                                newLinks[idx] = e.target.value;
                                                setVideoLinks(newLinks);
                                            }}
                                            className="flex-1 p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400"
                                        />
                                        {link && <button onClick={() => {
                                            const newLinks = [...videoLinks];
                                            newLinks[idx] = '';
                                            setVideoLinks(newLinks);
                                        }} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>}
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleSaveVideo} className="w-full py-4 bg-red-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-red-700"><Save size={18}/> Save Video Playlist</button>
                        </div>
                    )}

                    {activeTab === 'MCQ' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500 uppercase">Paste Google Sheet Data</label>
                                <button className="text-[10px] text-blue-600 font-bold flex items-center gap-1"><Copy size={12}/> Copy Template</button>
                            </div>
                            <textarea 
                                value={mcqText}
                                onChange={e => setMcqText(e.target.value)}
                                placeholder={`Question\tOption A\tOption B\tOption C\tOption D\tAnswer(A/B/C/D)\tExplanation\n...`}
                                className="w-full h-64 p-4 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-green-500 outline-none resize-none"
                            />
                            <div className="bg-green-50 p-4 rounded-xl text-xs text-green-700">
                                <strong>Format:</strong> Question [TAB] Option A [TAB] Option B [TAB] Option C [TAB] Option D [TAB] Answer Key [TAB] Explanation
                            </div>
                            <button onClick={handleSaveMCQ} className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-green-700"><Save size={18}/> Process & Save MCQs</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
