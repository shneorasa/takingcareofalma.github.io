
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Plane, Heart, Clock, Calendar, CheckCircle, RefreshCw, MapPin, Utensils, Moon, Car, Settings, BarChart, Trash2, Plus, Edit2, X, Save, Share2, Info } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
type TaskType = 'איסוף' | 'ארוחה' | 'מקלחת והשכבה' | 'לינה' | 'עזרה כללית';

interface CareTask {
  id: string;
  shiftId: string;
  taskType: TaskType;
  description: string;
  time: string;
  assignedTo?: string;
  dateLabel: string;
}

interface FlightShift {
  id: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  dateLabel: string;
  careStart: string;
  careEnd: string;
  status: 'ממתין' | 'מאויש' | 'הסתיים';
}

interface FamilyMember {
  id: string;
  name: string;
  role: 'אמא' | 'אבא' | 'סבתא' | 'סבא';
  avatar: string;
  isAdmin: boolean;
}

// --- Constants ---
const FAMILY_MEMBERS: FamilyMember[] = [
  { id: 'm1', name: 'אמא', role: 'אמא', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mom', isAdmin: true },
  { id: 'f1', name: 'אבא', role: 'אבא', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dad', isAdmin: true },
  { id: 'g1', name: 'סבתא', role: 'סבתא', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Grandma', isAdmin: false },
  { id: 'g2', name: 'סבא', role: 'סבא', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Grandpa', isAdmin: false },
];

const getTaskIcon = (type: string, size = 28) => {
  if (type.includes('איסוף')) return <Car size={size} className="text-blue-500" />;
  if (type.includes('ארוחה')) return <Utensils size={size} className="text-orange-500" />;
  if (type.includes('מקלחת')) return <Moon size={size} className="text-purple-500" />;
  return <Heart size={size} className="text-rose-500" />;
};

// --- App Component ---
const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<FamilyMember>(FAMILY_MEMBERS[2]); 
  const [shifts, setShifts] = useState<FlightShift[]>([]);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'open' | 'mine' | 'admin'>('open');
  
  // Backoffice State
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editShiftForm, setEditShiftForm] = useState<Partial<FlightShift>>({});
  const [editTaskForm, setEditTaskForm] = useState<Partial<CareTask>>({});

  useEffect(() => {
    const savedShifts = localStorage.getItem('family_alma_v5');
    const savedTasks = localStorage.getItem('tasks_alma_v5');
    if (savedShifts) setShifts(JSON.parse(savedShifts));
    if (savedTasks) setTasks(JSON.parse(savedTasks));
  }, []);

  useEffect(() => {
    localStorage.setItem('family_alma_v5', JSON.stringify(shifts));
    localStorage.setItem('tasks_alma_v5', JSON.stringify(tasks));
  }, [shifts, tasks]);

  const handleSync = async () => {
    setIsSyncing(true);
    const mockEvents = [
      "טיסת אל על LY315 ללונדון יוצאת ב-14:00 ב-25/10/2024",
      "חזרה מפריז AF123 נחיתה ב-22:00 ב-28/10/2024",
    ];

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `אתה מתאם טיפול משפחתי חכם. נתח את אירועי היומן עבור אמא דיילת. זהה טיסות וצור 3 משימות טיפול בילדה "עלמא" (איסוף, ארוחה, השכבה). החזר JSON בעברית.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt + "\n" + mockEvents.join('\n'),
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                flightNumber: { type: Type.STRING },
                origin: { type: Type.STRING },
                destination: { type: Type.STRING },
                departureTime: { type: Type.STRING },
                arrivalTime: { type: Type.STRING },
                dateLabel: { type: Type.STRING },
                careStart: { type: Type.STRING },
                careEnd: { type: Type.STRING },
                suggestedTasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING },
                      description: { type: Type.STRING },
                      time: { type: Type.STRING },
                      dateLabel: { type: Type.STRING }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const results = JSON.parse(response.text || '[]');
      const newShifts: FlightShift[] = [];
      const newTasks: CareTask[] = [];

      results.forEach((res: any, idx: number) => {
        const sId = `s-${Date.now()}-${idx}`;
        newShifts.push({
          id: sId,
          flightNumber: res.flightNumber,
          origin: res.origin,
          destination: res.destination,
          departureTime: res.departureTime,
          arrivalTime: res.arrivalTime,
          dateLabel: res.dateLabel,
          careStart: res.careStart,
          careEnd: res.careEnd,
          status: 'ממתין'
        });

        res.suggestedTasks.forEach((st: any, sIdx: number) => {
          newTasks.push({
            id: `t-${sId}-${sIdx}`,
            shiftId: sId,
            taskType: st.type as any,
            description: st.description,
            time: st.time,
            dateLabel: st.dateLabel
          });
        });
      });

      setShifts(prev => [...newShifts, ...prev]);
      setTasks(prev => [...newTasks, ...prev]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const claimTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignedTo: currentUser.id } : t));
  };

  const cancelTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignedTo: undefined } : t));
  };

  const removeShift = (shiftId: string) => {
    if(window.confirm('למחוק את הטיסה ואת כל המשימות של עלמא הקשורות אליה?')) {
      setShifts(prev => prev.filter(s => s.id !== shiftId));
      setTasks(prev => prev.filter(t => t.shiftId !== shiftId));
    }
  };

  const startEditingShift = (shift: FlightShift) => {
    setEditingShiftId(shift.id);
    setEditShiftForm(shift);
  };

  const saveShiftEdit = () => {
    if (!editingShiftId) return;
    setShifts(prev => prev.map(s => s.id === editingShiftId ? { ...s, ...editShiftForm } as FlightShift : s));
    setEditingShiftId(null);
  };

  const startEditingTask = (task: CareTask) => {
    setEditingTaskId(task.id);
    setEditTaskForm(task);
  };

  const saveTaskEdit = () => {
    if (!editingTaskId) return;
    setTasks(prev => prev.map(t => t.id === editingTaskId ? { ...t, ...editTaskForm } as CareTask : t));
    setEditingTaskId(null);
  };

  const toggleUser = () => {
    const nextIndex = (FAMILY_MEMBERS.indexOf(currentUser) + 1) % FAMILY_MEMBERS.length;
    setCurrentUser(FAMILY_MEMBERS[nextIndex]);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto shadow-2xl overflow-hidden font-['Assistant'] relative">
      
      <header className="bg-rose-500 pt-10 pb-6 px-6 text-white shadow-lg shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-2xl">
               <Heart size={28} className="fill-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">דואגים לעלמא</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleUser} className="text-[10px] bg-rose-600 px-3 py-1.5 rounded-xl font-bold border border-rose-400 active:scale-95 transition-all">החלף פרופיל</button>
            <button onClick={handleSync} disabled={isSyncing} className="bg-rose-400 p-2.5 rounded-full active:scale-90 transition-all shadow-lg">
              <RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <p className="mt-3 font-bold text-sm opacity-90 flex items-center gap-2">
          <Plane size={14} /> אמא טסה? כולנו בשביל עלמא!
        </p>
      </header>

      <div className="bg-white p-4 border-b flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src={currentUser.avatar} className="w-14 h-14 rounded-full border-4 border-rose-100 shadow-inner" />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <p className="font-black text-lg text-slate-800 leading-tight">שלום, {currentUser.name}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{currentUser.role} במשמרת</p>
          </div>
        </div>
        <div className="bg-rose-50 px-4 py-2.5 rounded-2xl text-center border border-rose-100">
          <p className="text-[10px] font-black text-rose-400 uppercase">עזרת כבר</p>
          <p className="text-xl font-black text-rose-600 leading-none">{tasks.filter(t => t.assignedTo === currentUser.id).length}</p>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 pb-24">
        {activeTab === 'open' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="text-rose-500" />
                <h2 className="text-xl font-black text-slate-800">מתי עלמא צריכה עזרה?</h2>
              </div>
              <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                 שידור חי
              </div>
            </div>
            
            {shifts.length === 0 && !isSyncing && (
              <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plane className="text-slate-200" size={40} />
                </div>
                <p className="text-slate-400 font-bold text-lg leading-tight px-10">היומן של אמא ריק כרגע.<br/><span className="text-sm font-medium">תהנו מזמן איכות עם עלמא!</span></p>
              </div>
            )}

            {shifts.map(shift => (
              <div key={shift.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200 space-y-5 transition-all">
                <div className="bg-rose-50 -mx-6 -mt-6 p-5 rounded-t-[32px] flex justify-between items-center border-b border-rose-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                      <Clock size={20} className="text-rose-500" />
                    </div>
                    <span className="text-xl font-black text-rose-600">{shift.dateLabel}</span>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-full text-[10px] font-black text-slate-400 border border-slate-100 uppercase tracking-tighter">
                    טיסת {shift.flightNumber}
                  </div>
                </div>

                <div className="flex items-center justify-between text-center py-2">
                  <div className="flex-1">
                    <p className="text-3xl font-black text-slate-800 tracking-tighter">{shift.origin}</p>
                    <p className="text-xs text-slate-400 font-bold mt-1">המראה: {shift.departureTime}</p>
                  </div>
                  <div className="flex flex-col items-center px-4 relative">
                    <div className="h-[2px] w-16 bg-slate-100 relative">
                      <Plane className="absolute left-1/2 -top-[9px] -translate-x-1/2 text-rose-400 rotate-180" size={18} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-3xl font-black text-slate-800 tracking-tighter">{shift.destination}</p>
                    <p className="text-xs text-slate-400 font-bold mt-1">נחיתה: {shift.arrivalTime}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {tasks.filter(t => t.shiftId === shift.id).map(task => (
                    <div key={task.id} className="bg-slate-50 p-4 rounded-3xl border border-slate-100 relative transition-all active:scale-[0.98]">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-4 bg-white rounded-2xl shadow-sm">
                          {getTaskIcon(task.taskType)}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-lg leading-none">{task.description}</p>
                          <p className="text-sm text-slate-500 font-bold mt-2 flex items-center gap-1">
                            <Clock size={14} /> שעה: {task.time}
                          </p>
                        </div>
                      </div>

                      {task.assignedTo ? (
                        <div className="bg-emerald-50 p-4 rounded-2xl flex items-center justify-between border border-emerald-100 animate-in fade-in zoom-in duration-300">
                          <div className="flex items-center gap-3">
                            <img src={FAMILY_MEMBERS.find(f => f.id === task.assignedTo)?.avatar} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                            <p className="text-sm font-black text-emerald-700">
                              {FAMILY_MEMBERS.find(f => f.id === task.assignedTo)?.name} כבר בדרך!
                            </p>
                          </div>
                          {task.assignedTo === currentUser.id && (
                            <button onClick={() => cancelTask(task.id)} className="text-xs font-black text-red-500 underline uppercase decoration-2 underline-offset-4">ביטול</button>
                          )}
                        </div>
                      ) : (
                        <button 
                          onClick={() => claimTask(task.id)}
                          className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[24px] font-black text-2xl shadow-xl shadow-emerald-200 active:bg-emerald-700 transition-all flex items-center justify-center gap-3"
                        >
                          <Plus size={28} />
                          אני אעזור כאן!
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'mine' && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <CheckCircle className="text-emerald-500" /> התוכניות שלי עם עלמא
            </h2>
            {tasks.filter(t => t.assignedTo === currentUser.id).map(task => (
              <div key={task.id} className="bg-white p-6 rounded-[32px] shadow-sm border-r-[12px] border-r-emerald-500 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400 font-black uppercase mb-1">{task.dateLabel} • {task.time}</p>
                  <p className="text-xl font-black text-slate-800">{task.description}</p>
                </div>
                <button onClick={() => cancelTask(task.id)} className="bg-red-50 p-4 rounded-2xl text-red-300 hover:text-red-500 transition-colors">
                  <Trash2 size={24} />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'admin' && currentUser.isAdmin && (
          <div className="space-y-6 animate-in fade-in duration-300 pb-10">
             <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Settings className="text-indigo-500" /> ניהול הורים
              </h2>
            </div>
            {/* Backoffice Logic goes here - Restored from original App.tsx */}
            {shifts.map(shift => (
              <div key={shift.id} className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-slate-800 text-lg">{shift.flightNumber} • {shift.dateLabel}</p>
                  </div>
                  <button onClick={() => removeShift(shift.id)} className="p-3 bg-red-50 text-red-300 rounded-2xl"><Trash2 size={20} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-6 pt-3 pb-8 flex justify-between items-center z-50 max-w-md mx-auto">
        <button onClick={() => setActiveTab('open')} className={`flex flex-col items-center gap-1 ${activeTab === 'open' ? 'text-rose-500' : 'text-slate-400'}`}>
          <div className={`p-2 rounded-2xl ${activeTab === 'open' ? 'bg-rose-50 shadow-inner' : ''}`}>
            <Calendar size={28} />
          </div>
          <span className="text-[10px] font-black uppercase">עזרה</span>
        </button>
        <button onClick={() => setActiveTab('mine')} className={`flex flex-col items-center gap-1 ${activeTab === 'mine' ? 'text-rose-500' : 'text-slate-400'}`}>
          <div className={`p-2 rounded-2xl ${activeTab === 'mine' ? 'bg-rose-50 shadow-inner' : ''}`}>
            <CheckCircle size={28} />
          </div>
          <span className="text-[10px] font-black uppercase">המשימות שלי</span>
        </button>
        {currentUser.isAdmin && (
          <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 ${activeTab === 'admin' ? 'text-indigo-500' : 'text-slate-400'}`}>
            <div className={`p-2 rounded-2xl ${activeTab === 'admin' ? 'bg-indigo-50 shadow-inner' : ''}`}>
              <Settings size={28} />
            </div>
            <span className="text-[10px] font-black uppercase">ניהול</span>
          </button>
        )}
      </nav>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
